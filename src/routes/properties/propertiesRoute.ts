import * as awsx from '@pulumi/awsx';
import * as uuid from 'uuid';
import { createDynamo, createS3 } from '../../initAWS';
import { ImageService, imageUrlFormatter } from '../../propertyImageService';
import {
  parseBody, buildApiResponse, add500Handler, buildBadRequestResponse, getUserId,
} from '$src/apiGatewayUtilities';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '../settings';
import { PropertiesDynamoModel, Property, PropertyRating } from './propertiesModel';

export interface PropertyImageApiResponse {
  id: number,
  url: string
}

export interface PropertyLandmarkApiResponse {
  name: string;
  distance: number;
}

export interface PropertyApiResponse {
  id: string,
  name: string,
  totalRoomsNumber: number,
  description: string,
  created_date: string,
  cover_image_url?: string,
  images: PropertyImageApiResponse[];
  address?: string;
  country?: string;
  city?: string;
  opportunities: string[];
  landmarks: PropertyLandmarkApiResponse[];
  price: number;
  rating: number;
  isConfirmed: boolean;
}

export function getPropertyRating(ratings: PropertyRating[]) {
  return ratings.length ? Math.round(ratings.reduce((c: number, r: PropertyRating) => c + r.rating, 0) / ratings.length) : 0;
}

function toResponse(property: Property, toUrl: (key: string) => string): PropertyApiResponse {
  return {
    id: property.id,
    name: property.name,
    totalRoomsNumber: property.totalRoomsNumber,
    description: property.description,
    created_date: property.created_date.toISOString(),
    cover_image_url: property.cover_image_key && toUrl(property.cover_image_key),
    images: property.property_images.map(img => ({
      id: img.id,
      url: toUrl(img.image_key),
    })),
    address: property.address,
    city: property.city,
    country: property.country,
    landmarks: property.landmarks,
    opportunities: property.opportunities,
    price: property.price,
    rating: getPropertyRating(property.ratings),
    isConfirmed: property.isConfirmed,
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
    const authorId = getUserId(event);
    const {
      description, name, address, city, country, landmarks, opportunities, price,
      cover_image_base64, cover_image_file_name, totalRoomsNumber,
    } = parseBody(event);
    const date = new Date();

    let imageKey: string | undefined;
    if (cover_image_base64 && cover_image_file_name) {
      imageKey = await uploader.uploadImage(newId, cover_image_base64, cover_image_file_name);
    }

    const errMissing = (prop: string) => buildBadRequestResponse(`Please provide the ${prop} field for the property`);

    if (!price) return errMissing('price');
    if (!name) return errMissing('name');
    if (!description) return errMissing('description');

    const property: Property = {
      id: newId,
      authorId: authorId,
      created_date: date,
      description: description.toString(),
      name: name.toString(),
      totalRoomsNumber: totalRoomsNumber ? +totalRoomsNumber : 1,
      cover_image_key: imageKey,
      property_images: [],
      address,
      city,
      country,
      landmarks: landmarks || [],
      opportunities: opportunities || [],
      price: +price,
      ratings: [],
      isConfirmed: false,
    };

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
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
    const {
      name, description, address, country, city, landmarks, opportunities, price,
      cover_image_base64, cover_image_file_name,
    } = parseBody(event);

    const search = await dbModel.findById(id);

    if (!search) {
      return buildNotFound();
    }

    if (!search.isConfirmed) {
      return buildApiResponse(403, {
        message: 'Property not confirmed'
      });
    }

    let imageKey = search.cover_image_key;
    if (cover_image_base64 && cover_image_file_name) {
      imageKey = await uploader.uploadImage(id, cover_image_base64, cover_image_file_name);
    }

    const property: Property = {
      id,
      name: name || search.name,
      authorId: search.authorId,
      totalRoomsNumber: search.totalRoomsNumber,
      description: description || search.description,
      created_date: search.created_date,
      cover_image_key: imageKey,
      property_images: [],
      address: address || search.address,
      country: country || search.country,
      city: city || search.city,
      landmarks: landmarks || search.landmarks,
      opportunities: opportunities || search.opportunities,
      price: price || search.price,
      ratings: search.ratings,
      isConfirmed: search.isConfirmed,
    };

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
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
    const userId = getUserId(event);

    const property = await dbModel.findById(id);

    if (!property) {
      return buildNotFound();
    }

    if (!property.isConfirmed && property.authorId !== userId) {
      return buildApiResponse(403, {
        message: 'Property not confirmed'
      });
    }

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
  };

  return add500Handler(handler);
}

export function propertyAddImage() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const s3 = createS3();
  const staticBucket = process.env[STATIC_BUCKET_ENV_KEY];
  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticBucket || !staticDomain) {
    throw new Error('Configuration was not provided');
  }

  const uploader = new ImageService(s3, staticBucket, 'property_images');

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';
    const body = parseBody(event);

    const property = await dbModel.findById(id);

    if (!property) {
      return buildNotFound();
    }

    const newId = property.property_images.map((i) => i.id).reduce((p, n) => (p > n ? p : n), 0) + 1;
    const imageKey = await uploader.uploadImage(id, body.image_base64, body.image_file_name);

    property.property_images.push({
      id: newId,
      image_key: imageKey,
    });

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
  };

  return add500Handler(handler);
}

export function propertyRemoveImage() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Configuration was not provided');
  }

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';
    const imageId = event.pathParameters ? +event.pathParameters.imageId : 0;

    const property = await dbModel.findById(id);

    if (!property) {
      return buildNotFound();
    }

    const toRemove = property.property_images.find(pi => pi.id === imageId);

    if (!toRemove) {
      return buildNotFound();
    }

    property.property_images = property.property_images.filter(i => i !== toRemove);

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
  };

  return add500Handler(handler);
}

export function propertyReorderImages() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Configuration was not provided');
  }

  const handler = async (event: awsx.apigateway.Request) => {
    const id = event.pathParameters ? event.pathParameters.id : '';
    const property = await dbModel.findById(id);

    if (!property) {
      return buildNotFound();
    }

    const body = parseBody(event);
    const imageIds: number[] = body.imageIdsInOrder || [];

    if (imageIds.length !== property.property_images.length) {
      return buildBadRequestResponse(`Expected an array of image ids with the same length as the amound of images in the property 
      (expected length=${property.property_images.length})`);
    }

    const newPropertyImages = [];
    for (let idx = 0; idx < imageIds.length; idx++) {
      const imageId = imageIds[idx];
      const saved = property.property_images.find(i => i.id === imageId);

      if (!saved) {
        return buildBadRequestResponse(`Could not find image with id=${imageId}`);
      }

      newPropertyImages.push(saved);
    }

    property.property_images = newPropertyImages;

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
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

    const collection = properties
      .filter((p) => p.isConfirmed)
      .map((p) => toResponse(p, (key) => imageUrlFormatter(key, staticDomain)));

    return buildApiResponse(200, collection);
  };

  return add500Handler(handler);
}

export function propertyRate() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = getUserId(event);

    const propertyId = event.pathParameters!.id;

    const body = parseBody(event);

    const search = await dbModel.findById(propertyId);

    if (!search) {
      return buildNotFound();
    }

    if (!search.isConfirmed && search.authorId !== customerId) {
      return buildApiResponse(403, {
        message: 'Property not confirmed'
      });
    }

    const property: Property = {
      ...search,
      ratings: search.ratings.concat({
        customerId,
        rating: +body.rating,
      }),
    };

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
  };

  return add500Handler(handler);
}

export function propertyConfirm() {
  const dynamo = createDynamo();
  const dbModel = new PropertiesDynamoModel(dynamo);

  const staticDomain = process.env[STATIC_DOMAIN_ENV_KEY];

  if (!staticDomain) {
    throw new Error('Expected staticDomain config to be present');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handler = async (event: awsx.apigateway.Request) => {
    const propertyId = event.pathParameters!.id;

    const search = await dbModel.findById(propertyId);

    if (!search) {
      return buildNotFound();
    }

    if (search.isConfirmed) {
      return buildApiResponse(403, {
        message: 'Property already confirmed'
      });
    }

    const property: Property = {
      ...search,
      isConfirmed: true,
    };

    await dbModel.save(property);

    return buildApiResponse(200, toResponse(property, (key) => imageUrlFormatter(key, staticDomain)));
  };

  return add500Handler(handler);
}