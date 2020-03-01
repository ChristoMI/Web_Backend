/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { marshall, parseBody, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { createDynamo } from '$src/initAWS';
import AnalysisService from '$src/services/AnalysisService';

import { getMoodType } from './moodTypeConversion';

function toResponse(entry: DynamoDB.AttributeMap) {
  return {
    id: entry.id.S,
    text: entry.text.S,
    propertyId: entry.propertyId.S,
    author: {
      id: entry.author.M!.id.S,
      firstName: entry.author.M!.firstName.S,
      lastName: entry.author.M!.lastName.S,
      avatarUrl: entry.author.M!.avatarUrl.S || null,
    },
    moodType: getMoodType(+entry.mood.M!.compound.N!),
    createdDate: entry.createdDate.S,
  };
}

function unmarshalls(items: DynamoDB.Types.ItemList) {
  return items.map((item) => toResponse(item));
}

async function query(
  dynamo: DynamoDB,
  params: DynamoDB.Types.QueryInput,
  items: Array<Object> = [],
): Promise<Array<Object>> {
  const data = await dynamo.query(params).promise();

  const newItems = items.concat(data.Items || []);

  if (data.LastEvaluatedKey) {
    const newParams = {
      ...params,
      ExclusiveStartKey: data.LastEvaluatedKey,
    };

    return query(dynamo, newParams, newItems);
  }

  return Promise.resolve(newItems);
}

function sortByDate(field: any) {
  return (list: Array<any>) => list.sort((a, b) => (+new Date(b[field]) - +new Date(a[field])));
}

async function hasProperty(dynamo: DynamoDB, propertyId: string): Promise<boolean> {
  const data = await dynamo.getItem({
    TableName: 'properties',
    Key: {
      id: { S: propertyId },
    },
  }).promise();

  return !!data.Item;
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

    return buildApiResponse(200, unmarshalls(comments));
  };

  return add500Handler(handler);
}

export function createPropertyComment() {
  const dynamo = createDynamo();

  const analysisService = new AnalysisService(process.env.AnalysisServerUrl!);

  const handler = async (event: awsx.apigateway.Request) => {
    const authorId = uuidv4(); // FIXME: change id
    const propertyId = event.pathParameters!.id;
    const body = parseBody(event);

    const exist = await hasProperty(dynamo, propertyId);

    if (!exist) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    const mood = await analysisService.getCommentMood({
      comment: body.text,
    });

    const comment = marshall({
      id: uuidv4(),
      text: body.text,
      propertyId,
      author: {
        id: authorId,
        firstName: 'FirstName',
        lastName: 'LastName',
        avatarUrl: null,
      },
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

    return buildApiResponse(200, toResponse(comment));
  };

  return add500Handler(handler)
}