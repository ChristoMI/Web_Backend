/**
 * Creates S3 buckets in local minio by inspecting declarative PULUMI infrastructure
 */

import '../configTestEnvironment'
import {staticBucket} from '../../infrastructure/staticContent'
import * as AWS from 'aws-sdk'
import * as pulumi from "@pulumi/pulumi";
import { Bucket } from '@pulumi/aws/s3';


const s3 = new AWS.S3();
s3.createBucket({
    Bucket: staticBucket,
    ACL: "public-read"
}, (err, data) => {if(err) console.error(err); else console.log('Created: ', data)})