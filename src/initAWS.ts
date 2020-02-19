import * as AWSSDK from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const isAwsRuntime = () => !!(process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);

// It is important to not capture via X-Ray on non-deployed environments
// Otherwise it will cause a bunch of errors
export const createDynamo = () => isAwsRuntime() ? AWSXRay.captureAWSClient(new AWSSDK.DynamoDB()) : new AWSSDK.DynamoDB()