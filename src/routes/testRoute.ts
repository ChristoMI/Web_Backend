import * as awsx from "@pulumi/awsx";
import * as AWS from 'aws-sdk'
import * as uuid from 'uuid'

const dynamo = new AWS.DynamoDB()

// Define our routes, independent from the API Gateway itself.
export async function testRouteCreate(
    event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> {
    const newId = uuid()
    return dynamo.putItem({
        TableName: 'test-stuff',
        Item: { Id: { S: newId } }
    })
        .promise()
        .then((r) => {
            return {
                statusCode: 200,
                body: JSON.stringify({ id: newId }),
            };
        })
}

// Define our routes, independent from the API Gateway itself.
export async function testRouteGet(
    event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> {

    const body = JSON.parse(event.body || '')
    return dynamo.getItem({
        TableName: 'test-stuff',
        Key: { "Id": { "S": body.id.toString() } }
    })
        .promise()
        .then((r) => {
            if (r.Item) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ id: r.Item.Id.S }),
                };
            }

            return {
                statusCode: 404,
                body: 'Not Found'
            }
        })
}