/**
 * Creates S3 buckets in local minio by inspecting declarative PULUMI infrastructure
 */

import '../configTestEnvironment';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
s3.createBucket({
  Bucket: 'testbucket',
  ACL: 'public-read',
// eslint-disable-next-line no-console
}, (err, data) => { if (err) console.error(err); else console.log('Created: ', data); });