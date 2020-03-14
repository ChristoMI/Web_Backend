import * as awsx from '@pulumi/awsx';
import * as uuid from 'uuid';
import { CallbackFactory } from '@pulumi/aws/lambda';
import { createDynamo } from '../initAWS';

export function testRouteCreate() {
  const dynamo = createDynamo();

  return async (event: awsx.apigateway.Request) => {
    const newId = uuid();

    console.log('Current account: ' + event.requestContext.accountId);

    await dynamo.putItem({
      TableName: 'test-stuff',
      Item: { Id: { S: newId } },
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ id: newId }),
    };
  };
}

// Define our routes, independent from the API Gateway itself.
export function testRouteGet() {
  const dynamo = createDynamo();

  return async (event: awsx.apigateway.Request) => {
    console.log('Current event: ');
    console.log(event.body);
    console.log(event.headers);
    console.log(event.multiValueHeaders);
    console.log(event.httpMethod);
    console.log(event.isBase64Encoded);
    console.log(event.path);
    console.log(event.pathParameters);
    console.log(event.queryStringParameters);
    console.log(event.multiValueQueryStringParameters);
    console.log(event.stageVariables);
    console.log(event.requestContext);
    console.log(event.resource);
    console.log('Current account: ' + event.requestContext.accountId);

    let id = '';
    if (event.pathParameters) {
      id = event.pathParameters.id || '';
    }

    const response = await dynamo.getItem({
      TableName: 'test-stuff',
      Key: { Id: { S: id.toString() } },
    }).promise();

    if (response.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify({ id: response.Item.Id.S }),
      };
    }

    return {
      statusCode: 404,
      body: 'Not Found',
    };
  };
}