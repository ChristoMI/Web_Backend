import * as awsx from "@pulumi/awsx";
import * as uuid from 'uuid'
import { createDynamo } from './../initAWS';
import AWS = require("aws-sdk");
 
export function propertyInsert() {
    const dynamo = createDynamo()

    return async (event: awsx.apigateway.Request) => {
        try{
            const newId = uuid();
            const body = JSON.parse(event.body || '{}');
            const date = new Date().toISOString();
    
            const response = await dynamo.putItem({
                TableName: 'properties',
                Item: { 
                    id: { S: newId },
                    name: {S: body.name || ''},
                    description : {S: body.description || ''},
                    created_date: {S: date}
                }
            }).promise();
    
            return {
                statusCode: 200,
                body: JSON.stringify({
                    id: newId ,
                    name:body.name || '',
                    description: body.description || '',
                    created_date: date
                }),
            };

        } catch(e){
            return {
                statusCode: 500,
                body: JSON.stringify(e)
            }
        }
    }
}

export function propertyUpdate() {
    const dynamo = createDynamo();

    return async (event: awsx.apigateway.Request) => {
        try{
            const id = event.pathParameters ? event.pathParameters.id : '';
            const body = JSON.parse(event.body || '{}')
    
            const search = await dynamo.getItem({
                TableName: 'properties',
                Key: { "id": { "S": id.toString() } }
            }).promise();

            if (!search.Item) {
                return {
                    statusCode: 404,
                    body: 'Item not found'
                };
            };

            const response = await dynamo.putItem({
                TableName: 'properties',
                Item: { 
                    id: { S: id },
                    name: {S: body.name || search.Item.name.S},
                    description : {S: body.description || search.Item.description.S}
                }
            }).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    id: id,
                    name: body.name || search.Item.name.S,
                    description: body.description || search.Item.description.S,
                    created_date: search.Item.created_date.S
                }),
            };
            

        } catch(e){
            return {
                statusCode: 500,
                body: JSON.stringify(e)
            };
        }
    }
}

export function propertyGetById() {
    const dynamo = createDynamo()

    return async (event: awsx.apigateway.Request) => {
        try{
            const id = event.pathParameters ? event.pathParameters.id : '';
            
            const response = await dynamo.getItem({
                TableName: 'properties',
                Key: { "id": { "S": id.toString() } }
            }).promise();
    
            return response.Item ? {
                statusCode: 200,
                body: JSON.stringify(AWS.DynamoDB.Converter.unmarshall(response.Item)),
            } : {
                statusCode: 404,
                body: 'Not Found'
            };          
    
        } catch(e){
            return {
                statusCode: 500,
                body: JSON.stringify(e)
            };
        }
    }
}

export function propertiesGet() {
    const dynamo = createDynamo()

    return async (event: awsx.apigateway.Request) => {
        try{
            const response = await dynamo.scan({
                TableName: 'properties'
            }).promise();

            const collection = response.Items ? response.Items.map((element: any) => AWS.DynamoDB.Converter.unmarshall(element)) : [];

            return collection.length ? {
                statusCode: 200,
                body: JSON.stringify(collection),
            } : {
                statusCode: 404,
                body: 'Not Found'
            }; 
        } catch(e){
            return {
                statusCode: 500,
                body: JSON.stringify(e)
            };
        }
    }
}