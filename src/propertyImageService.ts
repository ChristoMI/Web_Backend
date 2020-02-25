import {S3} from 'aws-sdk'
import {join} from 'path'
import {resolve} from 'url'
import uuid = require('uuid')

export class PropertyImageService {
    private s3: S3
    private bucketName: string
    private readonly coverImagePrefix = 'covers'

    constructor(s3: S3, bucketName: string) {
        this.s3 = s3
        this.bucketName = bucketName
    }

    async uploadCoverImage(propertyId: string, imageContent: string, imageFilename: string) {
        const key = join(this.coverImagePrefix, propertyId, uuid(), imageFilename)
        
        await this.s3.putObject({
            Bucket: this.bucketName,
            Key: key,
            Body: imageContent,
            ACL: 'public-read'
        }).promise()

        return key
    }
}

export const imageUrlFormatter = (key: string, domainName: string) => resolve('https://' + domainName, key)