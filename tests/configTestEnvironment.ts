import aws = require('aws-sdk');

process.env.PULUMI_TEST_MODE = 'true';
process.env.PULUMI_NODEJS_STACK = 'my-ws';
process.env.PULUMI_NODEJS_PROJECT = 'dev';
process.env.PULUMI_CONFIG = '{ "aws:region": "us-west-2", "static:domain": "abcde.xyz", "static:certificateArn": "someArn" }';

aws.config.update({
  region: 'us-west-2',
  dynamodb: {
    endpoint: 'http://localhost:8000',
  },
  s3: {
    endpoint: 'http://localhost:9000',
    s3ForcePathStyle: true,
  },
  accessKeyId: 'test',
  secretAccessKey: 'testtesttest',
});