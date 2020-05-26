import { apigateway } from '@pulumi/awsx';
import { DynamoDB } from 'aws-sdk';
import {
  getUserId, parseBody, marshall, buildApiResponse, add500Handler,
} from '$src/apiGatewayUtilities';
import { createDynamo, createS3 } from '$src/initAWS';
import { ImageService, imageUrlFormatter } from '$src/propertyImageService';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '../settings';

function toResponse(entry: DynamoDB.AttributeMap, staticDomain: string) {
  return {
    id: entry.id.S,
    username: entry.username.S,
    email: entry.email && entry.email.S,
    firstName: entry.firstName && entry.firstName.S,
    lastName: entry.lastName && entry.lastName.S,
    avatarUrl: (entry.avatarKey && imageUrlFormatter(entry.avatarKey.S!, staticDomain))
      || (entry.avatarUrl && entry.avatarUrl.S),
    createdAt: entry.createdAt.S,
    updatedAt: entry.updatedAt.S,
    isAdmin: entry.isAdmin ? entry.isAdmin.BOOL : false,
  };
}

const tableName = 'host';

export function createProfile() {
  const dynamo = createDynamo();

  return async (event: any, context: any, callback: any) => {
    const user = event.request.userAttributes;

    try {
      await dynamo.putItem({
        TableName: tableName,
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
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY]!;

  const handler = async (event: apigateway.Request) => {
    const hostId = getUserId(event);

    const host = await dynamo.getItem({
      TableName: tableName,
      Key: {
        id: { S: hostId },
      },
    }).promise();

    if (!host.Item) {
      return buildApiResponse(404, { message: 'Host not found' });
    }

    return buildApiResponse(200, toResponse(host.Item, staticDomain));
  };

  return add500Handler(handler);
}

export function updateProfile() {
  const dynamo = createDynamo();
  const s3 = createS3();
  const staticBucket = process.env[STATIC_BUCKET_ENV_KEY]!;
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY]!;

  const imageService = new ImageService(s3, staticBucket, 'host-profiles');

  const handler = async (event: apigateway.Request) => {
    const hostId = getUserId(event);

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

    if (body.avatarBase64 && body.avatarFileName) {
      const key = await imageService.uploadImage(hostId, body.avatarBase64, body.avatarFileName);
      expressions.push('avatarKey = :key');
      attributes[':key'] = { S: key };
    }

    if (expressions.length) {
      attributes[':id'] = { S: hostId };
      expressions.push('updatedAt = :updatedAt');
      attributes[':updatedAt'] = { S: new Date().toISOString() };
    } else {
      return buildApiResponse(400, { message: 'No fields for updating' });
    }

    const notFound = () => buildApiResponse(404, { message: 'Host not found' });

    try {
      const host = await dynamo.updateItem({
        TableName: tableName,
        Key: {
          id: { S: hostId },
        },
        ConditionExpression: 'id = :id',
        UpdateExpression: `set ${expressions.join(', ')}`,
        ExpressionAttributeValues: attributes,
        ReturnValues: 'ALL_NEW',
      }).promise();

      if (!host.Attributes) {
        return notFound();
      }

      return buildApiResponse(200, toResponse(host.Attributes, staticDomain));
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        return notFound();
      }

      throw err;
    }
  };

  return add500Handler(handler);
}

async function isUserAdmin(dynamo: DynamoDB, userId: string) {
  const current = await dynamo.getItem({
    TableName: tableName,
    Key: {
      id: { S: userId },
    },
  }).promise();

  return current.Item && current.Item.isAdmin && current.Item.isAdmin.BOOL;
}

export function markAsAdmin() {
  const dynamo = createDynamo();

  const handler = async (event: apigateway.Request) => {
    const body = parseBody(event);
    const currentHostId = getUserId(event);

    const isAdmin = await isUserAdmin(dynamo, currentHostId);
    if (!isAdmin) {
      return buildApiResponse(403, { message: 'Current user is not an Admin' });
    }

    const targetId = event.pathParameters!.hostId;
    if (currentHostId === targetId) {
      return buildApiResponse(400, { message: 'Can not change status of oneself' });
    }

    const targetAdmin = !!body.isAdmin;
    const result = await dynamo.updateItem({
      TableName: tableName,
      Key: {
        id: { S: targetId },
      },
      ConditionExpression: 'id = :id',
      UpdateExpression: 'set isAdmin = :isAdmin',
      ExpressionAttributeValues: { ':isAdmin': { BOOL: targetAdmin }, ':id': { S: targetId } },
    }).promise();

    if (!result) {
      return buildApiResponse(404, { message: 'Host not found' });
    }

    return buildApiResponse(204, { message: 'Host updated successfully' });
  };

  return add500Handler(handler);
}

export function getAllProfiles() {
  const dynamo = createDynamo();
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY]!;

  const handler = async (event: apigateway.Request) => {
    const currentHostId = getUserId(event);

    const isAdmin = await isUserAdmin(dynamo, currentHostId);
    if (!isAdmin) {
      return buildApiResponse(403, { message: 'Current user is not an Admin' });
    }

    const hosts = await dynamo.scan({
      TableName: tableName,
    }).promise();

    if (!hosts.Items) {
      return buildApiResponse(404, { message: 'Hosts not found' });
    }

    return buildApiResponse(200, hosts.Items.map(h => toResponse(h, staticDomain)));
  };

  return add500Handler(handler);
}