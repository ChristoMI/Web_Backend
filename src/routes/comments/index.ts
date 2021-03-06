/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import {
  marshall, parseBody, buildApiResponse, add500Handler,
} from '$src/apiGatewayUtilities';
import { query } from '$src/dynamodb/utils';
import { createDynamo } from '$src/initAWS';
import AnalysisService from '$src/services/AnalysisService';

import { getMoodType } from './moodTypeConversion';
import { PropertiesDynamoModel } from '../properties/propertiesModel';
import { getNonAdminUser } from '../user';
import { canSee, insuficientPermissionsResult } from '../propertyPermission';

function toResponse(entry: DynamoDB.AttributeMap, authors: Map<string, any>) {
  const author = entry.authorId && entry.authorId.S && authors.has(entry.authorId.S)
    ? authors.get(entry.authorId.S)
    : null;

  return {
    id: entry.id.S,
    text: entry.text.S,
    propertyId: entry.propertyId.S,
    author: author && {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      avatarUrl: author.avatarUrl,
    },
    moodType: getMoodType(+entry.mood.M!.compound.N!),
    createdDate: entry.createdDate.S,
  };
}

function toArrayResponse(items: DynamoDB.Types.ItemList, authors: Map<string, any>) {
  return items.map((item) => toResponse(item, authors));
}

function sortByDate(field: any) {
  return (list: Array<any>) => list.sort((a, b) => (+new Date(b[field]) - +new Date(a[field])));
}

async function getCustomerProfiles(dynamo: DynamoDB, ids: Set<string>): Promise<Map<string, any>> {
  if (!ids.size) return new Map<string, any>();

  const profilesTable = 'customer';
  const items = await dynamo.batchGetItem({
    RequestItems: {
      [profilesTable]: {
        Keys: Array.from(ids.values(), (id) => ({
          id: {
            S: id,
          },
        })),
      },
    },
  }).promise();

  const responses = items.Responses;
  if (!responses) return new Map<string, any>();

  return new Map(Array.from(responses[profilesTable], (i) => [i.id.S!, DynamoDB.Converter.unmarshall(i)]));
}

export function getCommentsByPropertyId() {
  const dynamo = createDynamo();
  const propertyModel = new PropertiesDynamoModel(dynamo);

  const handler = async (event: awsx.apigateway.Request) => {
    const propertyId = event.pathParameters!.id;
    const user = await getNonAdminUser(event);

    const params = {
      TableName: 'comment',
      KeyConditionExpression: 'propertyId = :propertyId',
      ExpressionAttributeValues: {
        ':propertyId': { S: propertyId },
      },
      Limit: 1000,
    };

    const property = await propertyModel.findById(propertyId);

    if (!property) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    if (!canSee(user, property)) return insuficientPermissionsResult();

    const comments = await query(dynamo, params)
      .then(sortByDate('createdDate'));

    const authorIds = comments.map((c) => c.authorId && c.authorId.S).filter((c) => c);
    const uniqueAuthorIds = new Set(authorIds);
    const authors = await getCustomerProfiles(dynamo, uniqueAuthorIds);

    return buildApiResponse(200, toArrayResponse(comments, authors));
  };

  return add500Handler(handler);
}

export function createPropertyComment() {
  const dynamo = createDynamo();
  const propertyModel = new PropertiesDynamoModel(dynamo);

  const analysisService = new AnalysisService(process.env.AnalysisServerUrl!);

  const handler = async (event: awsx.apigateway.Request) => {
    const user = await getNonAdminUser(event);
    const propertyId = event.pathParameters!.id;
    const body = parseBody(event);

    const property = await propertyModel.findById(propertyId);

    if (!property) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    if (!canSee(user, property) || user.type === 'Anonymous') return insuficientPermissionsResult();

    const mood = await analysisService.getCommentMood(body.text);

    const comment = marshall({
      id: uuidv4(),
      text: body.text,
      propertyId,
      authorId: user.userId,
      mood: {
        neg: mood.neg,
        neu: mood.neu,
        pos: mood.pos,
        compound: mood.compound,
      },
      createdDate: new Date().toISOString(),
    });

    await dynamo.putItem({
      TableName: 'comment',
      Item: comment,
    }).promise();
    const authors = await getCustomerProfiles(dynamo, new Set([user.userId]));
    return buildApiResponse(200, toResponse(comment, authors));
  };

  return add500Handler(handler);
}