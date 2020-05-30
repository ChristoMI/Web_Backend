import { DynamoDB } from 'aws-sdk';
import { apigateway } from '@pulumi/awsx';
import { extractUserIdFromToken } from '$src/apiGatewayUtilities/jwtTokenAuth';

export class AuthorizedUser {
  public readonly userId: string;

  public readonly isAdmin: boolean;

  public readonly type = 'Authorized';

  constructor(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }
}

export class AnonymousUser {
  public readonly type = 'Anonymous';
}

export type User = AnonymousUser | AuthorizedUser;

async function extractUserIfFromApiGatewayEvent(event: apigateway.Request): Promise<string | undefined> {
  if (event.requestContext.authorizer
    && event.requestContext.authorizer.claims
    && event.requestContext.authorizer.claims.sub) {
    return event.requestContext.authorizer.claims.sub;
  }

  // default (cognito authorizers) cannot handle authorized-or-anonymous logic
  // so the workaround is to require no authorizers and chech the token manually
  const authHeader = event.headers.Authorization;
  if (authHeader) {
    const token = authHeader.substr('Bearer '.length);
    return extractUserIdFromToken(token);
  }

  return undefined;
}

export async function getNonAdminUser(event: apigateway.Request) {
  const userId = await extractUserIfFromApiGatewayEvent(event);

  if (!userId) {
    return new AnonymousUser();
  }

  return new AuthorizedUser(userId, false);
}

export async function getUser(userId: string, dynamo: DynamoDB): Promise<User> {
  let user = await dynamo.getItem({
    TableName: 'host',
    Key: {
      id: { S: userId },
    },
  }).promise();

  if (!user.Item) {
    user = await dynamo.getItem({
      TableName: 'customer',
      Key: {
        id: { S: userId },
      },
    }).promise();
  }

  if (!user.Item) {
    throw new Error(`User #${userId} not found`);
  }

  const isAdmin = user.Item && user.Item.isAdmin && user.Item.isAdmin.BOOL;
  return new AuthorizedUser(userId, isAdmin || false);
}

export async function getCurrentUser(event: apigateway.Request, dynamo: DynamoDB): Promise<User> {
  const userId = await extractUserIfFromApiGatewayEvent(event);

  if (!userId) {
    return new AnonymousUser();
  }

  return getUser(userId, dynamo);
}