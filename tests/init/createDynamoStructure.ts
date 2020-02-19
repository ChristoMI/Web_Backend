/**
 * Creates DynamoDB tables in local db by inspecting declarative PULUMI infrastructure
 */


process.env.PULUMI_TEST_MODE = 'true';
process.env.PULUMI_NODEJS_STACK = 'my-ws';
process.env.PULUMI_NODEJS_PROJECT = 'dev';
process.env.PULUMI_CONFIG = '{ "aws:region": "us-west-2" }';

import * as dynamoStructure from '../../infrastructure/dynamodb'
import { Table } from '@pulumi/aws/dynamodb'
import * as AWS from 'aws-sdk'
import * as pulumi from "@pulumi/pulumi";

AWS.config.update({
    region: "us-west-2",
    dynamodb: {
        endpoint: "http://localhost:8000"
    }
});

const promise = <T>(out: pulumi.Output<T>): Promise<pulumi.Unwrap<T>> => {
    let anyOut: any = out
    return anyOut.promise()
}

let total = 0
let actual = 0
const tables = Object.values(dynamoStructure).filter(c => c instanceof Table).map(c => <Table>c)
const dynamodb = new AWS.DynamoDB();
for (const table of tables) {
    total += 1
    Promise.all([promise(table.hashKey), promise(table.rangeKey), promise(table.name), promise(table.attributes)])
        .then((a) => {
            const [hashKey, rangeKey, name, attributes] = a 
            const keys = []
            if(hashKey) {
                keys.push({AttributeName: hashKey, KeyType: "HASH"})
            }
            if(rangeKey) {
                keys.push({AttributeName: rangeKey, KeyType: "RANGE"})
            }

            let dynamoAttributes: AWS.DynamoDB.AttributeDefinitions = []
            if(attributes) {
                dynamoAttributes = attributes.map(e => ({
                    AttributeName: e.name,
                    AttributeType: e.type
                }))
            }

            dynamodb.createTable({
                AttributeDefinitions: dynamoAttributes,
                TableName: name || 'default',
                KeySchema: keys,
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1
                }
            }, (err, data) => {if(err) console.error(err); else console.log('Created: ', data)})
            actual += 1
        })
}