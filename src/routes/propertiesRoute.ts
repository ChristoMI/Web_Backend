import * as awsx from "@pulumi/awsx";
import * as uuid from 'uuid'
import { createDynamo } from './../initAWS'
 
export function propertyInsert() {
    const dynamo = createDynamo()

    return async (event: awsx.apigateway.Request) => {
        try{
            const newId = uuid();
            const body = JSON.parse(event.body || '{}')
    
            const response = await dynamo.putItem({
                TableName: 'properties',
                Item: { 
                    id: { S: newId },
                    name: {S: body.name || ''},
                    description : {S: body.description || ''},
                    created_date: {S: new Date().toISOString()}
                }
            }).promise();
    
            return {
                statusCode: 200,
                body: JSON.stringify(response.Attributes),
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
                    name: {S: body.name || search.Item.name},
                    description : {S: body.description || search.Item.description},
                    cover_image : {S: body.cover_image || search.Item.cover_image}
                }
            }).promise();

            return {
                statusCode: 200,
                body: JSON.stringify(response.Attributes),
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

            if (!id) {
                return {
                    statusCode: 400,
                    body: 'Empty id'
                };
            }; 
            
            const response = await dynamo.getItem({
                TableName: 'properties',
                Key: { "id": { "S": id.toString() } }
            }).promise();
    
            return response.Item ? {
                statusCode: 200,
                body: JSON.stringify(response.Item),
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

            return response ? {
                statusCode: 200,
                body: JSON.stringify(response.Items),
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