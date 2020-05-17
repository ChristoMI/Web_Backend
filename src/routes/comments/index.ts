/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { marshall, parseBody, query, hasProperty, buildApiResponse, add500Handler, getUserId } from '$src/apiGatewayUtilities';
import { createDynamo } from '$src/initAWS';
import AnalysisService from '$src/services/AnalysisService';

import { getMoodType } from './moodTypeConversion';

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

  const handler = async (event: awsx.apigateway.Request) => {
    const propertyId = event.pathParameters!.id;

    const params = {
      TableName: 'comment',
      KeyConditionExpression: 'propertyId = :propertyId',
      ExpressionAttributeValues: {
        ':propertyId': { S: propertyId },
      },
      Limit: 1000,
    };

    const exist = await hasProperty(dynamo, propertyId);

    if (!exist) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

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

  const analysisService = new AnalysisService(process.env.AnalysisServerUrl!);

  const handler = async (event: awsx.apigateway.Request) => {
    const authorId = getUserId(event);
    const propertyId = event.pathParameters!.id;
    const body = parseBody(event);

    const exist = await hasProperty(dynamo, propertyId);

    if (!exist) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    const mood = await analysisService.getCommentMood(body.text);

    const comment = marshall({
      id: uuidv4(),
      text: body.text,
      propertyId,
      authorId,
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
    const authors = await getCustomerProfiles(dynamo, new Set([authorId]));
    return buildApiResponse(200, toResponse(comment, authors));
  };

  return add500Handler(handler);
}