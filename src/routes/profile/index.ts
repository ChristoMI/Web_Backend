/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { parseBody, toAttributeValue, marshall, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { createDynamo } from '$src/initAWS';

function toResponse(entry: DynamoDB.AttributeMap) {
  return {
    id: entry.id.S,
    username: entry.username.S,
    email: entry.email.S,
    firstName: entry.firstName.S,
    lastName: entry.lastName.S,
    // avatarUrl:
    createdAt: entry.createdAt.S,
    updatedAt: entry.updatedAt.S,
  };
}

export function createCustomerProfile() {
  const dynamo = createDynamo();

  const handler = async (event: awsx.apigateway.Request) => {
    // console.log(event.request.userAttributes);

    const customer = marshall({
      id: uuidv4(),
      // username:
      // email:
      // firstName:
      // lastName:
      // avatarUrl:
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await dynamo.putItem({
      TableName: 'customer',
      Item: customer,
    }).promise();

    return buildApiResponse(200, toResponse(customer));
  };

  return add500Handler(handler);
}

export function getCustomerProfile() {
  const dynamo = createDynamo();

  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = uuidv4(); // FIXME: get customerId by token

    const customer = await dynamo.getItem({
      TableName: 'customer',
      Key: {
        id: { S: customerId },
      },
    }).promise();

    if (!customer.Item) {
      return buildApiResponse(404, { message: 'Customer not found' });
    }

    return buildApiResponse(200, toResponse(customer.Item));
  };

  return add500Handler(handler);
}

export function updateCustomerProfile() {
  const dynamo = createDynamo();

  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = uuidv4(); // FIXME: get customerId by token

    const body = parseBody(event);

    // toAttributeValue(username) <=> { S: username }

    // -username
    // -email

    // firstName
    // lastName
    // avatarUrl

    // updatedAt: new Date().toISOString(),

    const customer = await dynamo.updateItem({
      TableName: 'customer',
      Key: {
        id: { S: customerId },
      },
      UpdateExpression: 'SET ', // TODO
      ExpressionAttributeValues: { // TODO
        // ':' {  },
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    if (!customer.Attributes) {
      return buildApiResponse(404, { message: 'Customer not found' });
    }

    return buildApiResponse(200, toResponse(customer.Attributes));
  };

  return add500Handler(handler);
}
