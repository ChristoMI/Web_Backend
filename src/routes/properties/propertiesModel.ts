import { DynamoDB } from 'aws-sdk';

export interface Property {
    id: string;
    name: string;
    description: string;
    created_date: Date;
    cover_image_key?: string;
}

export class PropertiesDynamoModel {
    private dynamodb: DynamoDB;

    readonly tableName = 'properties';


    constructor(dynamodb: DynamoDB) {
        this.dynamodb = dynamodb;    
    }

    private toProperty(attributes: DynamoDB.AttributeMap) {
        return {
            id: attributes.id.S!,
            name: attributes.name.S!,
            description: attributes.description.S!,
            created_date: new Date(attributes.created_date.S!),
            cover_image_key: attributes.cover_image_key && attributes.cover_image_key.S
        }
    }

    async save(property: Property) {
        const item: DynamoDB.AttributeMap = {
            id: { S: property.id },
            name: { S: property.name },
            description: { S: property.description },
            created_date: { S: property.created_date.toISOString() },
        }

        if (property.cover_image_key) {
            item.cover_image_key = { S: property.cover_image_key };
        }

        await this.dynamodb.putItem({
            TableName: this.tableName,
            Item: item
        }).promise()
    }

    async findById(id: string): Promise<Property | null> {
        const search = await this.dynamodb.getItem({
            TableName: this.tableName,
            Key: { id: { S: id.toString() } },
        }).promise();

        if(!search.Item) {
            return null;
        }

        return this.toProperty(search.Item);
    }

    async findAll() {
        const response = await this.dynamodb.scan({
            TableName: this.tableName,
        }).promise();

        return response.Items!.map(this.toProperty)
    }
}
