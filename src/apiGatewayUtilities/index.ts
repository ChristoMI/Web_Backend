import { apigateway } from "@pulumi/awsx";
import { DynamoDB } from 'aws-sdk';
import * as AWSXray from 'aws-xray-sdk'

export const marshall = DynamoDB.Converter.marshall;
export const unmarshall = DynamoDB.Converter.unmarshall;

export function unmarshalls(items: DynamoDB.Types.ItemList) {
  return items.map((item) => unmarshall(item));
}

export function parseBody(event: apigateway.Request): { [key: string]: any } {
  const body = event.body || '{}';

  if (event.isBase64Encoded) {
    const buffer = new Buffer(body, 'base64');
    return JSON.parse(buffer.toString());
  }

  return JSON.parse(body);
}

export function buildApiResponse(
  statusCode: number,
  payload: { [key: string]: any },
): apigateway.Response {
  return {
    statusCode: statusCode,
    body: JSON.stringify(payload),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
}

export function logError(e: Error) {
  const segment = AWSXray.getSegment()
  if(segment) {
    segment.addError(e)
  }
  console.error(e)
}