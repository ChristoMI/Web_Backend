/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import axios from 'axios';
import { marshall, unmarshalls, response } from '$src/utils';
import { createDynamo } from '$src/initAWS';

import { getMoodType } from './utils';

export async function query(
  dynamo: any,
  params: DynamoDB.Types.QueryInput,
  items: Array<Object> = [],
): Promise<Array<Object>> {
  const data = await dynamo.query(params).promise();

  const newItems = items.concat(unmarshalls(data.Items));

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

export function getCommentsByPropertyId() {
  const dynamo = createDynamo();

  return async (event: awsx.apigateway.Request) => {
    const propertyId = event.pathParameters!.id;

    const params = {
      TableName: 'comment',
      KeyConditionExpression: 'propertyId = :propertyId',
      ExpressionAttributeValues: {
        ':propertyId': { S: propertyId },
      },
      Limit: 1000,
    };

    try {
      const comments = await query(dynamo, params)
        .then(sortByDate('createdDate'));

      return response(200, {
        items: comments,
        total: comments.length,
      });
    } catch (error) {
      return response(500, error);
    }
  };
}

export function createPropertyComment() {
  const dynamo = createDynamo();

  const MLServerUrl = process.env.MLServerUrl;

  return async (event: awsx.apigateway.Request) => {
    const authorId = uuidv4(); // FIXME: change id
    const propertyId = event.pathParameters!.id;
    const body = JSON.parse(event.body || '');

    try {
      const url = `${MLServerUrl}/analysis/comment`;

      const { data: mood } = await axios.post(url, {
        comment: body.text,
      });

      const comment = {
        id: uuidv4(),
        text: body.text,
        propertyId,
        authorId,
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

      return response(200, comment);
    } catch (error) {
      return response(500, error);
    }
  };
}