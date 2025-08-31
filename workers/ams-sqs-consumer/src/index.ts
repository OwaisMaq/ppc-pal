import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { createHmac } from 'crypto';
import fetch from 'node-fetch';
import { z } from 'zod';

// Environment variables
const SUPABASE_INGEST_URL = process.env.SUPABASE_INGEST_URL!;
const SUPABASE_INGEST_SECRET = process.env.SUPABASE_INGEST_SECRET!;

if (!SUPABASE_INGEST_URL || !SUPABASE_INGEST_SECRET) {
  throw new Error('Missing required environment variables: SUPABASE_INGEST_URL, SUPABASE_INGEST_SECRET');
}

// Schema validation for AMS messages
const AmsMessageSchema = z.object({
  dataset: z.string(),
  recordId: z.string(),
  profileId: z.string(),
  eventTime: z.string(),
  payload: z.record(z.any()),
});

const AmsPayloadSchema = z.object({
  dataset: z.string(),
  records: z.array(AmsMessageSchema),
});

// Logging utility
function logStep(step: string, details?: any): void {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] ${step}${detailsStr}`);
}

// HMAC signature generation
function generateSignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

// HTTP client with retries
async function postToSupabase(payload: any, retries = 3): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body, SUPABASE_INGEST_SECRET);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logStep(`HTTP request attempt ${attempt}`, { 
        url: SUPABASE_INGEST_URL, 
        dataset: payload.dataset, 
        records: payload.records.length 
      });

      const response = await fetch(SUPABASE_INGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
        },
        body,
      });

      if (response.ok) {
        const result = await response.json();
        logStep('Supabase request successful', result);
        return;
      }

      // Handle different error responses
      const errorText = await response.text();
      const statusCode = response.status;

      if (statusCode >= 400 && statusCode < 500) {
        // Client errors - don't retry, log and ack
        logStep('Client error - will not retry', { 
          statusCode, 
          error: errorText, 
          dataset: payload.dataset 
        });
        throw new Error(`Client error ${statusCode}: ${errorText}`);
      }

      if (statusCode >= 500 && attempt < retries) {
        // Server errors - retry with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logStep(`Server error - retrying in ${delayMs}ms`, { 
          statusCode, 
          error: errorText, 
          attempt 
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // Final attempt failed
      throw new Error(`HTTP ${statusCode}: ${errorText}`);

    } catch (error) {
      if (attempt === retries) {
        logStep('All retry attempts exhausted', { error: (error as Error).message });
        throw error;
      }
      
      // Network errors - retry
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logStep(`Network error - retrying in ${delayMs}ms`, { 
        error: (error as Error).message, 
        attempt 
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// Process a single SQS record
async function processRecord(record: SQSRecord): Promise<void> {
  try {
    // Parse the SQS message body
    const messageBody = JSON.parse(record.body);
    logStep('Processing SQS record', { 
      messageId: record.messageId, 
      receiptHandle: record.receiptHandle?.substring(0, 20) + '...'
    });

    // Extract AMS data from the message
    // Note: This assumes the SQS message contains the AMS payload directly
    // In a real implementation, you might need to parse AWS SQS wrapper formats
    let amsPayload;
    
    // Handle different message formats
    if (messageBody.Records) {
      // SNS -> SQS format
      amsPayload = messageBody.Records[0]?.Sns?.Message ? 
        JSON.parse(messageBody.Records[0].Sns.Message) : 
        messageBody.Records[0];
    } else {
      // Direct SQS format
      amsPayload = messageBody;
    }

    // Validate the AMS payload structure
    const validationResult = AmsPayloadSchema.safeParse(amsPayload);
    if (!validationResult.success) {
      logStep('Schema validation failed', { 
        error: validationResult.error.format(),
        messageId: record.messageId 
      });
      throw new Error(`Invalid AMS payload schema: ${validationResult.error.message}`);
    }

    const { dataset, records } = validationResult.data;
    
    // Batch records if needed (Supabase can handle up to 1000 records per request)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    // Send each batch to Supabase
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchPayload = {
        dataset,
        records: batch,
      };

      logStep(`Sending batch ${i + 1}/${batches.length}`, { 
        dataset, 
        batchSize: batch.length 
      });

      await postToSupabase(batchPayload);
    }

    logStep('Successfully processed SQS record', { 
      messageId: record.messageId, 
      dataset, 
      totalRecords: records.length,
      batches: batches.length 
    });

  } catch (error) {
    logStep('Failed to process SQS record', { 
      messageId: record.messageId, 
      error: (error as Error).message 
    });
    throw error;
  }
}

// Lambda handler
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  const startTime = Date.now();
  logStep('Lambda invocation started', { 
    recordCount: event.Records.length,
    requestId: context.awsRequestId 
  });

  const results: Array<{ messageId: string; status: 'success' | 'error'; error?: string }> = [];

  // Process each SQS record
  for (const record of event.Records) {
    try {
      await processRecord(record);
      results.push({ messageId: record.messageId, status: 'success' });
    } catch (error) {
      const errorMessage = (error as Error).message;
      results.push({ 
        messageId: record.messageId, 
        status: 'error', 
        error: errorMessage 
      });

      // For client errors (4xx), we don't want to retry - log and continue
      if (errorMessage.includes('Client error')) {
        logStep('Skipping retry for client error', { messageId: record.messageId });
        continue;
      }

      // For server errors (5xx) or network errors, throw to trigger SQS retry
      logStep('Throwing error to trigger SQS retry', { messageId: record.messageId });
      throw error;
    }
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  logStep('Lambda invocation completed', {
    requestId: context.awsRequestId,
    duration: `${duration}ms`,
    totalRecords: event.Records.length,
    successCount,
    errorCount,
    results: results.length < 10 ? results : `${results.length} records processed`
  });

  // CloudWatch structured logs for monitoring
  console.log(JSON.stringify({
    eventType: 'ams_lambda_execution',
    requestId: context.awsRequestId,
    duration,
    recordCount: event.Records.length,
    successCount,
    errorCount,
    timestamp: new Date().toISOString()
  }));
};