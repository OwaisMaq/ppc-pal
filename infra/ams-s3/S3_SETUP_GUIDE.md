# Amazon Marketing Stream S3 Delivery Setup Guide

## Overview
This guide helps you set up S3 delivery for Amazon Marketing Stream (AMS) data. S3 delivery is simpler than SQS as it only requires an S3 bucket without Lambda functions.

## Architecture
Amazon AMS → S3 Bucket → Supabase Edge Function (polls/processes files)

## Prerequisites
1. AWS Account with S3 access
2. AWS CLI installed and configured
3. Your Supabase project URL

## Step 1: Create S3 Bucket

Create a dedicated S3 bucket for AMS data:

```bash
# Choose a region matching your Amazon Advertising API endpoint:
# - EU sellers: eu-west-1
# - NA sellers: us-east-1  
# - FE sellers: us-west-2

aws s3 mb s3://ppcpal-ams-data-REGION --region REGION

# Example for EU:
aws s3 mb s3://ppcpal-ams-data-eu --region eu-west-1
```

## Step 2: Configure Bucket Policy

Create a bucket policy to allow Amazon Marketing Stream to write to your bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AmazonMarketingStreamAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "streaming.amazon-adsapi.com"
      },
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::ppcpal-ams-data-eu/*"
    }
  ]
}
```

Save this as `bucket-policy.json` and apply it:

```bash
aws s3api put-bucket-policy \
  --bucket ppcpal-ams-data-eu \
  --policy file://bucket-policy.json
```

## Step 3: Enable Bucket Notifications (Optional)

For real-time processing, configure S3 to notify your Supabase function when files arrive:

```bash
# First, create a notification configuration file:
cat > notification-config.json <<EOF
{
  "LambdaFunctionConfigurations": [],
  "TopicConfigurations": [],
  "QueueConfigurations": [],
  "EventBridgeConfiguration": {}
}
EOF

# Apply the configuration:
aws s3api put-bucket-notification-configuration \
  --bucket ppcpal-ams-data-eu \
  --notification-configuration file://notification-config.json
```

## Step 4: Create IAM User for Supabase Access

Create an IAM user that Supabase can use to read from the bucket:

```bash
# Create IAM user
aws iam create-user --user-name ppcpal-s3-reader

# Create access policy
cat > s3-read-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::ppcpal-ams-data-eu",
        "arn:aws:s3:::ppcpal-ams-data-eu/*"
      ]
    }
  ]
}
EOF

# Attach policy
aws iam put-user-policy \
  --user-name ppcpal-s3-reader \
  --policy-name S3ReadPolicy \
  --policy-document file://s3-read-policy.json

# Create access keys
aws iam create-access-key --user-name ppcpal-s3-reader
```

**Save the Access Key ID and Secret Access Key** - you'll need them for Supabase.

## Step 5: Update Supabase Secrets

Update your Supabase Edge Function secrets:

1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Add/update these secrets based on your region:

**For EU region (eu-west-1):**
- `AMS_S3_ARN_EU`: `arn:aws:s3:::ppcpal-ams-data-eu`
- `AWS_ACCESS_KEY_ID`: Your IAM access key
- `AWS_SECRET_ACCESS_KEY`: Your IAM secret key
- `AWS_REGION_EU`: `eu-west-1`

**For NA region (us-east-1):**
- `AMS_S3_ARN_NA`: `arn:aws:s3:::ppcpal-ams-data-na`
- `AWS_ACCESS_KEY_ID`: Your IAM access key
- `AWS_SECRET_ACCESS_KEY`: Your IAM secret key
- `AWS_REGION_NA`: `us-east-1`

**For FE region (us-west-2):**
- `AMS_S3_ARN_FE`: `arn:aws:s3:::ppcpal-ams-data-fe`
- `AWS_ACCESS_KEY_ID`: Your IAM access key
- `AWS_SECRET_ACCESS_KEY`: Your IAM secret key
- `AWS_REGION_FE`: `us-west-2`

## Step 6: Test the Integration

1. Go to PPC Pal Settings page
2. Navigate to "Data Streaming" tab
3. Toggle ON the switches for `sp-traffic` and `sp-conversion`
4. Check the console - you should see success messages
5. Within an hour, verify files appear in your S3 bucket:

```bash
aws s3 ls s3://ppcpal-ams-data-eu/sp-traffic/ --recursive
aws s3 ls s3://ppcpal-ams-data-eu/sp-conversion/ --recursive
```

## Data Structure

AMS will create files in your bucket with this structure:

```
s3://ppcpal-ams-data-eu/
  sp-traffic/
    year=2025/
      month=01/
        day=01/
          hour=14/
            file1.json.gz
            file2.json.gz
  sp-conversion/
    year=2025/
      month=01/
        day=01/
          file1.json.gz
```

## Processing Data

The system will automatically:
1. Poll the S3 bucket hourly for new files
2. Download and decompress GZIP files
3. Parse JSON records
4. Store in `ams_staging` table
5. Aggregate into campaign metrics

## Monitoring

Check your S3 bucket regularly:

```bash
# Check file count
aws s3 ls s3://ppcpal-ams-data-eu/sp-traffic/ --recursive | wc -l

# Check recent files
aws s3 ls s3://ppcpal-ams-data-eu/sp-traffic/ --recursive | tail -10

# Check bucket size
aws s3 ls s3://ppcpal-ams-data-eu --recursive --summarize
```

## Cost Estimate

- **S3 Storage**: ~$0.023/GB/month (first 50TB)
- **S3 Requests**: $0.0004 per 1,000 requests
- **Data Transfer**: Free from S3 to Supabase (same region)
- **Total**: Expect $1-5/month for typical usage

## Cleanup/Deletion

To remove all resources:

```bash
# Delete all files
aws s3 rm s3://ppcpal-ams-data-eu --recursive

# Delete bucket
aws s3 rb s3://ppcpal-ams-data-eu

# Delete IAM user
aws iam delete-access-key --user-name ppcpal-s3-reader --access-key-id YOUR_KEY_ID
aws iam delete-user-policy --user-name ppcpal-s3-reader --policy-name S3ReadPolicy
aws iam delete-user --user-name ppcpal-s3-reader
```

## Troubleshooting

### "Invalid destination" error
- Verify bucket exists: `aws s3 ls s3://ppcpal-ams-data-eu`
- Check bucket policy is applied correctly
- Ensure bucket is in the correct region
- Verify ARN format: `arn:aws:s3:::bucket-name` (no trailing slash)

### No files appearing
- Wait up to 2 hours for first delivery
- Check AMS subscription status in Supabase logs
- Verify campaigns have active spend
- Check S3 bucket permissions

### Files not processing
- Check Supabase Edge Function logs
- Verify AWS credentials are correct
- Ensure IAM user has read permissions
- Check file format (should be JSON.GZ)
