import * as AWSSDK from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DynamoDB } from 'aws-sdk';

const isAwsRuntime = () => !!(process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);

const captureIfAwsRuntime = <T extends AWSSDK.Service>(client: T): T => 
    // @ts-ignore the xray proxy should be assignable to the underlying client
    isAwsRuntime() ? AWSXRay.captureAWSClient(client) : client

// It is important to not capture via X-Ray on non-deployed environments
// Otherwise it will cause a bunch of errors
export const createDynamo = () => captureIfAwsRuntime(new AWSSDK.DynamoDB());
export const createS3 = () => captureIfAwsRuntime(new AWSSDK.S3());