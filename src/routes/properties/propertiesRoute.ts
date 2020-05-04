import * as awsx from '@pulumi/awsx';
import * as uuid from 'uuid';
import { createDynamo, createS3 } from '../../initAWS';
import { ImageService, imageUrlFormatter } from '../../propertyImageService';
import { parseBody, buildApiResponse, add500Handler } from '$src/apiGatewayUtilities';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '../settings';
import { PropertiesDynamoModel, Property } from './propertiesModel';

function toResponse(property: Property, toUrl: (key: string) => string) {
  return {
    id: property.id,
    name: property.name,
    description: property.description,
    created_date: property.created_date,
    cover_image_url: property.cover_image_key && toUrl(property.cover_image_key),
  };
}

function buildNotFound() {
  return buildApiResponse(404, { message: 'Not Found' });
}

export function propertyInsert() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);
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
    const date = new Date();

    let imageKey: string | undefined;
    if (body.cover_image_base64 && body.cover_image_file_name) {
      imageKey = await uploader.uploadImage(newId, body.cover_image_base64, body.cover_image_file_name);
    }

    await dbModel.save({
      id: newId,
      created_date: date,
      description: body.description || '',
      name: body.name || '',
      cover_image_key: imageKey,
      property_images: [],
    });

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
  const dbModel = new PropertiesDynamoModel(dynamo);
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

    const search = await dbModel.findById(id);

    if (!search) {
      return buildNotFound();
    }

    let imageKey = search.cover_image_key;
    if (body.cover_image_base64 && body.cover_image_file_name) {
      imageKey = await uploader.uploadImage(id, body.cover_image_base64, body.cover_image_file_name);
    }

    await dbModel.save({
      id,
      name: body.name || search.name,
      description: body.description || search.description,
      created_date: search.created_date,
      cover_image_key: imageKey,
      property_images: [],
    });

    return buildApiResponse(200, {
      id,
      name: body.name || search.name,
      description: body.description || search.description,
      created_date: search.created_date,
      cover_image_url: imageKey ? imageUrlFormatter(imageKey, staticDomain) : undefined,
    });
  };

  return add500Handler(handler);
}

export function propertyGetById() {
  const dynamo = createDynamo();
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];
  const dbModel = new PropertiesDynamoModel(dynamo);

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';

    const property = await dbModel.findById(id);

    return property
      ? buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)))
      : buildNotFound();
  };

  return add500Handler(handler);
}

export function propertiesGet() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handler = async (event: awsx.apigateway.Request) => {
    const properties = await dbModel.findAll();

    const collection = properties.map((element) => toResponse(element, (key) => imageUrlFormatter(key, staticDomain)));

    return buildApiResponse(200, collection);
  };

  return add500Handler(handler);
}