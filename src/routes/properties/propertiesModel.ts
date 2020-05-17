/* eslint-disable camelcase */
import { DynamoDB } from 'aws-sdk';

export interface Property {
    id: string;
    name: string;
    totalRoomsNumber: number;
    city?: string;
    country?: string;
    address?: string;
    opportunities: string[];
    landmarks: PropertyLandmark[];
    price: number;
    description: string;
    created_date: Date;
    cover_image_key?: string;
    property_images: PropertyImage[];
}

export interface PropertyLandmark {
  name: string;
  distance: number;
}

export interface PropertyImage {
    id: number;
    image_key: string;
}

export class PropertiesDynamoModel {
    private dynamodb: DynamoDB;

    private readonly tableName = 'properties';


    constructor(dynamodb: DynamoDB) {
      this.dynamodb = dynamodb;
    }

    private static toProperty(attributes: DynamoDB.AttributeMap): Property {
      return {
        id: attributes.id.S!,
        name: attributes.name.S!,
        totalRoomsNumber: attributes.totalRoomsNumber ? +attributes.totalRoomsNumber.N! : 1,
        price: attributes.price ? +attributes.price.N! : 0,
        opportunities: attributes.opportunities ? attributes.opportunities.SS! : [],
        landmarks: attributes.landmarks ? attributes.landmarks.L!.map(l => ({
          name: l.M!.name.S!,
          distance: +l.M!.distance.N!,
        }))
          : [],
        description: attributes.description.S!,
        created_date: new Date(attributes.created_date.S!),
        cover_image_key: attributes.cover_image_key && attributes.cover_image_key.S,
        address: attributes.address ? attributes.address.S! : undefined,
        city: attributes.city ? attributes.city.S! : undefined,
        country: attributes.country ? attributes.country.S! : undefined,
        property_images: attributes.property_images ? attributes.property_images.L!.map((i) => ({
          id: +i.M!.id.N!,
          image_key: i.M!.image_key.S!,
        }))
          : [],
      };
    }

    async save(property: Property) {
      const item: DynamoDB.AttributeMap = {
        id: { S: property.id },
        name: { S: property.name },
        description: { S: property.description },
        created_date: { S: property.created_date.toISOString() },
        property_images: {
          L: property.property_images.map((i) => ({
            M: {
              id: { N: i.id.toString() },
              image_key: { S: i.image_key },
            },
          })),
        },
        price: { N: property.price.toString() },
        landmarks: {
          L: property.landmarks.map(l => ({ M: { name: { S: l.name }, distance: { N: l.distance.toString() } } })),
        },
      };

      if (property.address) {
        item.address = { S: property.address };
      }

      if (property.city) {
        item.city = { S: property.city };
      }

      if (property.country) {
        item.country = { S: property.country };
      }

      if (property.opportunities.length) {
        item.opportunities = { SS: property.opportunities };
      }

      if (property.cover_image_key) {
        item.cover_image_key = { S: property.cover_image_key };
      }

      if (property.totalRoomsNumber) {
        item.totalRoomsNumber = { N: String(property.totalRoomsNumber) };
      }

      await this.dynamodb.putItem({
        TableName: this.tableName,
        Item: item,
      }).promise();
    }

    async findById(id: string): Promise<Property | null> {
      const search = await this.dynamodb.getItem({
        TableName: this.tableName,
        Key: { id: { S: id.toString() } },
      }).promise();

      if (!search.Item) {
        return null;
      }

      return PropertiesDynamoModel.toProperty(search.Item);
    }

    async findAll(): Promise<Property[]> {
      const response = await this.dynamodb.scan({
        TableName: this.tableName,
      }).promise();

      return response.Items!.map(PropertiesDynamoModel.toProperty);
    }
}