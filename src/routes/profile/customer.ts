import { apigateway } from '@pulumi/awsx';
import { DynamoDB } from 'aws-sdk';
import { getUserId, parseBody, marshall, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { createDynamo } from '$src/initAWS';

function toResponse(entry: DynamoDB.AttributeMap) {
  return {
    id: entry.id.S,
    username: entry.username.S,
    email: entry.email.S,
    firstName: entry.firstName.S,
    lastName: entry.lastName.S,
    avatarUrl: entry.avatarUrl && entry.avatarUrl.S,
    createdAt: entry.createdAt.S,
    updatedAt: entry.updatedAt.S,
  };
}

export function createProfile() {
  const dynamo = createDynamo();

  return async (event: any, context: any, callback: any) => {
    const user = event.request.userAttributes;

    try {
      await dynamo.putItem({
        TableName: 'customer',
        Item: marshall({
          id: user.sub,
          username: event.userName,
          email: user.email,
          firstName: user.given_name,
          lastName: user.family_name,
          avatarUrl: user.picture,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      }).promise();

      callback(null, event);
    } catch (e) {
      callback(e, event);
    }
  };
}

export function getProfile() {
  const dynamo = createDynamo();

  const handler = async (event: apigateway.Request) => {
    const customerId = getUserId(event);

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

export function updateProfile() {
  const dynamo = createDynamo();

  const handler = async (event: apigateway.Request) => {
    const customerId = getUserId(event);

    const body = parseBody(event);

    const expressions = [];
    const attributes: any = {};

    if (body.firstName) {
      expressions.push('firstName = :firstName');
      attributes[':firstName'] = { S: body.firstName };
    }

    if (body.lastName) {
      expressions.push('lastName = :lastName');
      attributes[':lastName'] = { S: body.lastName };
    }

    if (body.avatar) {
      // TODO: ?
    }

    if (expressions.length) {
      attributes[':id'] = { S: customerId };
      expressions.push('updatedAt = :updatedAt');
      attributes[':updatedAt'] = { S: new Date().toISOString() };
    } else {
      return buildApiResponse(400, { message: 'No fields for updating' });
    }

    try {
      const customer = await dynamo.updateItem({
        TableName: 'customer',
        Key: {
          id: { S: customerId },
        },
        ConditionExpression: 'id = :id',
        UpdateExpression: `set ${expressions.join(', ')}`,
        ExpressionAttributeValues: attributes,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return buildApiResponse(200, toResponse(customer.Attributes!));
    } catch (e) {
      return buildApiResponse(404, { message: 'Customer not found' });
    }
  };

  return add500Handler(handler);
}
