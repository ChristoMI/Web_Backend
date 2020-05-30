import { DynamoDB } from 'aws-sdk';
import { apigateway } from '@pulumi/awsx';

export class User {
  public readonly userId: string;

  public readonly isAdmin: boolean;

  constructor(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }
}

export function getNonAdminUser(event: apigateway.Request) {
  const userId = event.requestContext.authorizer!.claims.sub;
  return new User(userId, false);
}

export async function getCurrentUser(event: apigateway.Request, dynamo: DynamoDB) {
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
  return new User(userId, isAdmin || false);
}