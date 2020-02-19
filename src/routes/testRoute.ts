import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk'
import * as uuid from 'uuid'

const dynamo = new AWS.DynamoDB()

// Define our routes, independent from the API Gateway itself.
export async function testRouteHandler(
        event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> {
    return dynamo.putItem({
        TableName: 'test-stuff',
        Item: {Id: {S: uuid()}}
    })
    .promise()
    .then((r) => {
        return {
            statusCode: 200,
            body: "Hello, API Gateway!",
        };
    })
}