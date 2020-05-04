import { S3 } from 'aws-sdk';
import { join } from 'path';
import { resolve } from 'url';

import uuid = require('uuid')

export class ImageService {
    private s3: S3;

    private bucketName: string;

    private subfolder: string;

    constructor(s3: S3, bucketName: string, subfolder: string) {
      this.s3 = s3;
      this.bucketName = bucketName;
      this.subfolder = subfolder;
    }

    async uploadImage(id: string, imageContentBase64: string, imageFilename: string) {
      const key = join(this.subfolder, id, uuid(), imageFilename);

      await this.s3.putObject({
        Bucket: this.bucketName,
        Key: key,
        Body: Buffer.from(imageContentBase64, 'base64'),
        ACL: 'public-read',
      }).promise();

      return key;
    }
}

export const imageUrlFormatter = (key: string, domainName: string) => resolve(`https://${domainName}`, key);