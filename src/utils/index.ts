import { DynamoDB } from 'aws-sdk';

export const marshall = DynamoDB.Converter.marshall;
export const unmarshall = DynamoDB.Converter.unmarshall;

export function unmarshalls(items: DynamoDB.Types.ItemList) {
  return items.map((item) => unmarshall(item));
}

export function response(statusCode: Number, payload: any) {
  return {
    statusCode,
    body: JSON.stringify(payload),
  };
}