import * as awsx from '@pulumi/awsx';
import * as uuid from 'uuid';
import { DynamoDB } from 'aws-sdk';
import { createDynamo, createS3 } from '../../initAWS';
import { ImageService, imageUrlFormatter } from '../../propertyImageService';
import { parseBody, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '../settings';

function toResponse(dynamodbEntry: DynamoDB.AttributeMap, toUrl: (key: string) => string) {
  return {
    id: dynamodbEntry.id.S,
    name: dynamodbEntry.name.S,
    description: dynamodbEntry.description.S,
    created_date: dynamodbEntry.created_date.S,
    cover_image_url: (dynamodbEntry.cover_image_key && dynamodbEntry.cover_image_key.S)
      ? toUrl(dynamodbEntry.cover_image_key.S)
      : undefined,
  };
}

function buildNotFound() {
  return buildApiResponse(404, { message: 'Not Found' });
}

export function propertyInsert() {
  const dynamo = createDynamo();
  const s3 = createS3();
  const staticBucket = process.env[STATIC_BUCKET_ENV_KEY];
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticBucket || !staticDomain) {
    throw new Error('Configuration was not provided');
  }

  const uploader = new ImageService(s3, staticBucket, 'covers');

  const handler = async (event: awsx.apigateway.Request) => {
    const newId = uuid();
    const body = parseBody(event);
    const date = new Date().toISOString();

    let imageKey: string | undefined;
    if (body.cover_image_base64 && body.cover_image_file_name) {
      imageKey = await uploader.uploadImage(newId, body.cover_image_base64, body.cover_image_file_name);
    }

    const dynamodbItem: DynamoDB.AttributeMap = {
      id: { S: newId },
      name: { S: body.name || '' },
      description: { S: body.description || '' },
      created_date: { S: date },
    };

    if (imageKey) {
      dynamodbItem.cover_image_key = { S: imageKey };
    }

    const response = await dynamo.putItem({
      TableName: 'properties',
      Item: dynamodbItem,
    }).promise();

    return buildApiResponse(200, {
      id: newId,
      name: body.name || '',
      description: body.description || '',
      created_date: date,
      cover_image_url: imageKey ? imageUrlFormatter(imageKey, staticDomain) : undefined,
    });
  };

  return add500Handler(handler);
}

export function propertyUpdate() {
  const dynamo = createDynamo();
  const s3 = createS3();
  const staticBucket = process.env[STATIC_BUCKET_ENV_KEY];
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticBucket || !staticDomain) {
    throw new Error('Configuration was not provided');
  }

  const uploader = new ImageService(s3, staticBucket, 'covers');

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';
    const body = parseBody(event);

    const search = await dynamo.getItem({
      TableName: 'properties',
      Key: { id: { S: id.toString() } },
    }).promise();

    if (!search.Item) {
      return buildNotFound();
    }

    let imageKey: string | undefined = (search.Item.cover_image_key && search.Item.cover_image_key.S) || undefined;
    if (body.cover_image_base64 && body.cover_image_file_name) {
      imageKey = await uploader.uploadImage(id, body.cover_image_base64, body.cover_image_file_name);
    }

    const dynamodbItem: DynamoDB.AttributeMap = {
      id: { S: id },
      name: { S: body.name || search.Item.name.S },
      description: { S: body.description || search.Item.description.S },
      created_date: search.Item.created_date,
    };

    if (imageKey) {
      dynamodbItem.cover_image_key = { S: imageKey };
    }

    const response = await dynamo.putItem({
      TableName: 'properties',
      Item: dynamodbItem,
    }).promise();

    return buildApiResponse(200, {
      id,
      name: body.name || search.Item.name.S,
      description: body.description || search.Item.description.S,
      created_date: search.Item.created_date.S,
      cover_image_url: imageKey ? imageUrlFormatter(imageKey, staticDomain) : undefined,
    });
  };

  return add500Handler(handler);
}

export function propertyGetById() {
  const dynamo = createDynamo();
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';

    const response = await dynamo.getItem({
      TableName: 'properties',
      Key: { id: { S: id.toString() } },
    }).promise();

    return response.Item
      ? buildApiResponse(200, toResponse(response.Item, (key) => imageUrlFormatter(key, staticDomain)))
      : buildNotFound();
  };

  return add500Handler(handler);
}

export function propertiesGet() {
  const dynamo = createDynamo();
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  const handler = async (event: awsx.apigateway.Request) => {
    const response = await dynamo.scan({
      TableName: 'properties',
    }).promise();

    const collection = response.Items ? response.Items.map((element) => toResponse(element, (key) => imageUrlFormatter(key, staticDomain))) : [];

    return buildApiResponse(200, collection);
  };

  return add500Handler(handler);
}