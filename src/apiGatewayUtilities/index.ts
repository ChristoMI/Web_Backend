import { apigateway } from '@pulumi/awsx';
import { DynamoDB } from 'aws-sdk';
import * as AWSXray from 'aws-xray-sdk';

export const marshall = DynamoDB.Converter.marshall;
export const unmarshall = DynamoDB.Converter.unmarshall;


export function getUserId(event: apigateway.Request) {
  return event.requestContext.authorizer!.claims.sub;
}

export function parseBody(event: apigateway.Request): { [key: string]: any } {
  const body = event.body || '{}';

  if (event.isBase64Encoded) {
    const buffer = Buffer.from(body, 'base64');
    return JSON.parse(buffer.toString());
  }

  return JSON.parse(body);
}

export function buildApiResponse(
  statusCode: number,
  payload: { [key: string]: any },
): apigateway.Response {
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
}

export function buildBadRequestResponse(errorText: string, details: {[key: string]: any} = {}) {
  return buildApiResponse(400, {
    error: errorText,
    details,
  });
}

export function add500Handler(func: (event: apigateway.Request) => Promise<apigateway.Response>) {
  return async (event: apigateway.Request) => {
    try {
      return await func(event);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);

      try {
        const segment = AWSXray.getSegment();
        if (segment) {
          const subsegment = segment.addNewSubsegment('exception');
          subsegment.addError(error);
          subsegment.close();
        }
      } catch (errorXray) {
        // eslint-disable-next-line no-console
        console.error(errorXray);
      }

      return buildApiResponse(500, error);
    }
  };
}

export async function query(
  dynamo: DynamoDB,
  params: DynamoDB.Types.QueryInput,
  items: DynamoDB.Types.ItemList = [],
): Promise<DynamoDB.Types.ItemList> {
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

export async function hasProperty(dynamo: DynamoDB, propertyId: string): Promise<boolean> {
  const data = await dynamo.getItem({
    TableName: 'properties',
    Key: {
      id: { S: propertyId },
    },
  }).promise();

  return !!data.Item;
}