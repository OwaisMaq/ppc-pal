# AMS SQS Infrastructure

This directory contains Infrastructure as Code (IaC) templates for provisioning the Amazon Marketing Stream (AMS) SQS pipeline on AWS.

## Architecture

```
Amazon AMS → SQS Queue → Lambda Consumer → Supabase (via signed HTTPS)
```

## Components

- **AmsEventsQueue**: Main SQS queue with 4-day retention
- **AmsEventsDLQ**: Dead letter queue for failed messages  
- **AmsIngestLambda**: Node.js Lambda function to consume SQS messages
- **CloudWatch Alarms**: Monitoring for queue backlog and Lambda errors

## Deployment

### Prerequisites

1. AWS CLI configured with appropriate permissions
2. Node.js 20.x for Lambda runtime
3. Supabase project with `ams-ingest` function deployed

### Parameters

Before deploying, update the following parameters in the CloudFormation template:

- `SUPABASE_INGEST_URL`: Your Supabase function URL (e.g., `https://[project-id].supabase.co/functions/v1/ams-ingest`)
- `SUPABASE_INGEST_SECRET`: Shared secret for HMAC signature verification
- `Environment`: deployment environment (dev/staging/prod)

### Deploy with CloudFormation

```bash
# Deploy the infrastructure
aws cloudformation deploy \
  --template-file ams-infrastructure.yaml \
  --stack-name ams-pipeline-prod \
  --parameter-overrides \
    Environment=prod \
    SupabaseIngestUrl=https://[project-id].supabase.co/functions/v1/ams-ingest \
    SupabaseIngestSecret=[your-secret-key] \
  --capabilities CAPABILITY_IAM

# Package and deploy Lambda function
cd ../workers/ams-sqs-consumer
npm run build
zip -r ams-consumer.zip dist/ node_modules/
aws lambda update-function-code \
  --function-name ams-ingest-lambda-prod \
  --zip-file fileb://ams-consumer.zip
```

### Environment Variables

The Lambda function requires these environment variables (set via CloudFormation):

- `SUPABASE_INGEST_URL`: Target Supabase function URL
- `SUPABASE_INGEST_SECRET`: HMAC secret for request signing
- `NODE_ENV`: production

### Monitoring

CloudWatch alarms are configured for:

- **Queue Backlog**: Triggers when oldest message > 5 minutes
- **Lambda Errors**: Triggers on any Lambda function errors
- **DLQ Messages**: Triggers when messages hit the dead letter queue

## Security

- Lambda function has minimal IAM permissions (SQS read only)
- All database credentials kept in Supabase, not AWS
- HMAC signature verification prevents unauthorized writes
- VPC configuration not required (public internet access)

## Scaling

- SQS supports high throughput automatically
- Lambda concurrency can be adjusted based on load
- Dead letter queue prevents message loss on failures

## Cost Optimization

- 4-day message retention balances durability vs cost
- Lambda reserved concurrency prevents runaway costs
- CloudWatch log retention set to 14 days