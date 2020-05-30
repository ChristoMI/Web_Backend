import { DynamoDB } from 'aws-sdk';
import { apigateway } from '@pulumi/awsx';

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

function isAnonymous(event: apigateway.Request) {
  return !event.requestContext.authorizer
    || !event.requestContext.authorizer.claims
    || !event.requestContext.authorizer.claims.sub;
}

export function getNonAdminUser(event: apigateway.Request) {
  if (isAnonymous(event)) {
    return new AnonymousUser();
  }

  const userId = event.requestContext.authorizer!.claims.sub;
  return new AuthorizedUser(userId, false);
}

export async function getCurrentUser(event: apigateway.Request, dynamo: DynamoDB): Promise<User> {
  if (isAnonymous(event)) {
    return new AnonymousUser();
  }

  const userId = event.requestContext.authorizer!.claims.sub;

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