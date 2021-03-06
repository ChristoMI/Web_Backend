import { DynamoDB } from 'aws-sdk';

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