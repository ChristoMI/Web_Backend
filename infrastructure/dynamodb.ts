import * as aws from "@pulumi/aws";

const dynamo = new aws.dynamodb.Table('test-stuff', {
    attributes: [
        { name: 'Id', type: 'S'}
    ],
    readCapacity: 1,
    writeCapacity: 1,
    name: 'test-stuff',
    hashKey: 'Id'
})

export const testStuff = dynamo