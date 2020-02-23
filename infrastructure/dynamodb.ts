import * as aws from "@pulumi/aws";

const dynamo = new aws.dynamodb.Table('test-stuff', {
    attributes: [
        { name: 'Id', type: 'S'}
    ],
    readCapacity: 1,
    writeCapacity: 1,
    name: 'test-stuff',
    hashKey: 'Id'
});

const properties = new aws.dynamodb.Table('properties', {
    attributes: [
        { name: 'id', type: 'S'}
    ],
    name: 'properties',
    hashKey: 'id'
})

export const testStuff = dynamo;
export const propertiesTable = properties;