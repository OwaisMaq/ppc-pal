# Amazon Marketing Stream SQS Infrastructure Deployment Guide

## Overview
This CloudFormation template sets up the AWS infrastructure required for Amazon Marketing Stream integration with your PPC Pal application.

## What's Included
- **SQS Queue**: Receives Amazon Marketing Stream events
- **Queue Policy**: Grants Amazon Marketing Stream permission to send messages (supports EU, NA, and FE regions)
- **Dead Letter Queue**: Stores failed messages for troubleshooting
- **Lambda Function**: Processes messages and forwards to Supabase
- **CloudWatch Alarms**: Monitors queue backlog, Lambda errors, and DLQ messages

## Prerequisites
1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Your Supabase project URL
4. A secure random secret for HMAC signing

## Step 1: Generate HMAC Secret
Generate a secure random secret that will be used to sign requests from Lambda to Supabase:

```bash
# On Linux/Mac:
openssl rand -hex 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Save this secret - you'll need it for both AWS deployment and Supabase configuration.

## Step 2: Deploy the Stack

### Option A: Using AWS Console
1. Go to AWS CloudFormation Console
2. Click "Create Stack"
3. Upload the `ams-infrastructure.yaml` file
4. Fill in the parameters:
   - **Environment**: Choose `dev`, `staging`, or `prod`
   - **SupabaseIngestUrl**: `https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-ingest`
   - **SupabaseIngestSecret**: Paste the HMAC secret you generated
5. Review and create the stack

### Option B: Using AWS CLI
```bash
aws cloudformation create-stack \
  --stack-name ppcpal-ams-dev \
  --template-body file://ams-infrastructure.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=dev \
    ParameterKey=SupabaseIngestUrl,ParameterValue=https://ucbkcxupzjbblnzyiyui.supabase.co/functions/v1/ams-ingest \
    ParameterKey=SupabaseIngestSecret,ParameterValue=YOUR_HMAC_SECRET_HERE \
  --capabilities CAPABILITY_NAMED_IAM \
  --region eu-west-1
```

**Note**: Change `--region eu-west-1` to your preferred AWS region.

## Step 3: Get the Queue ARN
After the stack is created, get the SQS Queue ARN:

```bash
aws cloudformation describe-stacks \
  --stack-name ppcpal-ams-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`QueueArn`].OutputValue' \
  --output text
```

The ARN will look like: `arn:aws:sqs:eu-west-1:229742714366:ams-events-queue-dev`

## Step 4: Update Supabase Secrets
Update your Supabase `AMS_SQS_ARN_EU` secret with the full ARN:

1. Go to your Supabase project settings
2. Navigate to Edge Functions > Secrets
3. Update or create these secrets:
   - `AMS_SQS_ARN_EU`: The full ARN from Step 3
   - `AMS_INGEST_SECRET`: The same HMAC secret you used in deployment

## Step 5: Test the Integration
1. Go to your PPC Pal Settings page
2. Toggle the AMS switches for `sp-traffic` and `sp-conversion`
3. Check the console logs - you should see success messages
4. Verify in AWS CloudWatch that Lambda is being triggered

## Monitoring
- **CloudWatch Logs**: `/aws/lambda/ams-ingest-lambda-dev`
- **Queue Metrics**: Monitor in SQS Console
- **Alarms**: Check CloudWatch Alarms for issues

## Troubleshooting

### "Invalid destination" error
- Ensure the stack deployed successfully
- Verify the Queue Policy is attached (check SQS Console > Permissions tab)
- Confirm you're using the correct ARN in Supabase

### Lambda not triggering
- Check Lambda function logs in CloudWatch
- Verify the event source mapping is enabled
- Check IAM role permissions

### Messages in DLQ
- Review Lambda error logs
- Check if Supabase endpoint is accessible
- Verify HMAC secret matches on both sides

## Cost Estimate
- **SQS**: ~$0.40 per million requests
- **Lambda**: Free tier covers most usage, ~$0.20 per million requests after
- **CloudWatch**: Minimal costs for logs and alarms
- **Total**: Expect $5-20/month for typical usage

## Cleanup
To delete all resources:

```bash
aws cloudformation delete-stack --stack-name ppcpal-ams-dev
```

## Support
For issues or questions:
- Check CloudWatch logs first
- Review the AWS CloudFormation events
- Check Supabase edge function logs
- Verify all ARNs and secrets are correct
