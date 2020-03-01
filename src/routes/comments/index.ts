/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { marshall, unmarshalls, parseBody, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { createDynamo } from '$src/initAWS';

import { getMoodType } from './moodTypeConversion';

async function query(
  dynamo: DynamoDB,
  params: DynamoDB.Types.QueryInput,
  items: Array<Object> = [],
): Promise<Array<Object>> {
  const data = await dynamo.query(params).promise();

  const newItems = items.concat(unmarshalls(data.Items || []));

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

    return buildApiResponse(200, comments);
  };

  return add500Handler(handler);
}

export function createPropertyComment() {
  const dynamo = createDynamo();

  const MLServerUrl = process.env.MLServerUrl;

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

    const url = `${MLServerUrl}/analysis/comment`;

    const { data: mood } = await axios.post(url, {
      comment: body.text,
    });

    const comment = {
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
        type: getMoodType(mood.compound),
        neg: mood.neg,
        neu: mood.neu,
        pos: mood.pos,
        compound: mood.compound,
      },
      createdDate: new Date().toISOString(),
    };

    await dynamo.putItem({
      TableName: 'comment',
      Item: marshall(comment),
    }).promise();

    return buildApiResponse(200, comment);
  };

  return add500Handler(handler)
}