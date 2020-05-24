/* eslint-disable no-unused-vars */

import * as awsx from '@pulumi/awsx';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDB } from 'aws-sdk';
import {
  marshall, parseBody, buildApiResponse, add500Handler, getUserId,
} from '$src/apiGatewayUtilities';
import { query } from '$src/dynamodb/utils';
import { createDynamo } from '$src/initAWS';
import { PropertiesDynamoModel } from '../properties/propertiesModel';

function toResponse(entry: DynamoDB.AttributeMap) {
  return {
    id: entry.id.S,
    propertyId: entry.propertyId.S,
    customerId: entry.customerId.S,
    bookedRoomsNumber: entry.bookedRoomsNumber.S,
    beginDate: entry.beginDate.S,
    endDate: entry.endDate.S,
  };
}

function toArrayResponse(items: DynamoDB.Types.ItemList) {
  return items.map((item) => toResponse(item));
}

export function getCustomerReservations() {
  const dynamo = createDynamo();

  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = getUserId(event);

    const params = {
      TableName: 'reservation',
      KeyConditionExpression: 'customerId = :customerId',
      ExpressionAttributeValues: {
        ':customerId': { S: customerId },
      },
      Limit: 1000,
    };

    const reservations = await query(dynamo, params);

    return buildApiResponse(200, toArrayResponse(reservations));
  };

  return add500Handler(handler);
}

function splitRange(beginDate: Date, endDate: Date) {
  const dates = [];
  const currDate = new Date(beginDate);

  while (currDate < endDate) {
    dates.push(new Date(currDate));
    currDate.setDate(currDate.getDate() + 1);
  }

  dates.push(new Date(endDate));

  return dates;
}

interface Reservation {
  beginDate: Date,
  endDate: Date,
  bookedRoomsNumber: number
}

function countLockedRooms(beginDate: Date, endDate: Date, items: Reservation[]) {
  const dates = splitRange(beginDate, endDate);

  let totalLockedRoomsCount = 0;

  for (const date of dates) {
    const lockedRoomsCount = items.reduce((acc, item) => {
      const beginItemDate = new Date(String(item.beginDate));
      const endItemDate = new Date(String(item.endDate));

      if (beginItemDate <= date && date <= endItemDate) {
        return acc + Number(item.bookedRoomsNumber);
      }

      return acc;
    }, 0);

    if (lockedRoomsCount > totalLockedRoomsCount) {
      totalLockedRoomsCount = lockedRoomsCount;
    }
  }

  return totalLockedRoomsCount;
}

async function calculateLockedRoomsFromDynamo(propertyId: string, beginDate: Date, endDate: Date, dynamo: DynamoDB) {
  const params = {
    TableName: 'reservation',
    IndexName: 'reservation-by-property-id',
    KeyConditionExpression: 'propertyId = :propertyId',
    ExpressionAttributeValues: {
      ':propertyId': { S: propertyId },
    },
    Limit: 1000,
  };

  const queryResult = await query(dynamo, params);
  const reservations = queryResult.map(r => ({
    beginDate: new Date(String(r.beginDate.S)),
    endDate: new Date(String(r.endDate.S)),
    bookedRoomsNumber: Number(r.bookedRoomsNumber.N),
  }));
  const lockedRoomsCount = countLockedRooms(beginDate, endDate, reservations);
  return lockedRoomsCount;
}

export function getAvailableCountReservations() {
  const dynamo = createDynamo();
  const model = new PropertiesDynamoModel(dynamo);

  const handler = async (event: awsx.apigateway.Request) => {
    const propertyId = event.pathParameters!.id;
    const beginDate = new Date(event.queryStringParameters!.beginDate);
    const endDate = new Date(event.queryStringParameters!.endDate);

    if (beginDate > endDate) {
      return buildApiResponse(400, {
        message: 'Invalid data input',
      });
    }

    if (beginDate < new Date()) {
      return buildApiResponse(400, {
        message: 'Reservation date unavailable',
      });
    }

    const property = await model.findById(propertyId);

    if (!property) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    const lockedRoomsCount = await calculateLockedRoomsFromDynamo(property.id, beginDate, endDate, dynamo);
    const availableRoomsCount = property.totalRoomsNumber - lockedRoomsCount;


    return buildApiResponse(200, { availableRoomsCount });
  };

  return add500Handler(handler);
}

export function createReservation() {
  const dynamo = createDynamo();
  const model = new PropertiesDynamoModel(dynamo);

  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = getUserId(event);

    const body = parseBody(event);

    const propertyId = body.propertyId;
    const bookedRoomsNumber = +body.bookedRoomsNumber;
    const beginDate = new Date(body.beginDate);
    const endDate = new Date(body.endDate);

    const property = await model.findById(propertyId);

    if (!property) {
      return buildApiResponse(404, {
        message: 'Property not found',
      });
    }

    const lockedRoomsCount = await calculateLockedRoomsFromDynamo(property.id, beginDate, endDate, dynamo);
    const availableRoomsCount = property.totalRoomsNumber - lockedRoomsCount;

    if (availableRoomsCount < bookedRoomsNumber) {
      return buildApiResponse(400, {
        message: `Not enough rooms, available rooms count: ${availableRoomsCount}`,
      });
    }

    const reservation = marshall({
      id: uuidv4(),
      customerId,
      propertyId,
      bookedRoomsNumber,
      beginDate: String(beginDate),
      endDate: String(endDate),
    });

    await dynamo.putItem({
      TableName: 'reservation',
      Item: reservation,
    }).promise();

    return buildApiResponse(200, toResponse(reservation));
  };

  return add500Handler(handler);
}

export function deleteReservation() {
  const dynamo = createDynamo();

  const handler = async (event: awsx.apigateway.Request) => {
    const customerId = getUserId(event);

    const reservationId = event.pathParameters!.id;

    const reservation = await dynamo.getItem({
      TableName: 'reservation',
      Key: {
        id: { S: reservationId },
        customerId: { S: customerId },
      },
    }).promise();

    if (!reservation.Item) {
      return buildApiResponse(404, {
        message: 'Reservation not found',
      });
    }

    if (reservation.Item.customerId.S !== customerId) {
      return buildApiResponse(400, {
        message: 'You cannot delete someone else’s reservation',
      });
    }

    if (new Date(String(reservation.Item.beginDate.S)) <= new Date()) {
      return buildApiResponse(500, {
        message: 'Reservation duration has started',
      });
    }

    await dynamo.deleteItem({
      TableName: 'reservation',
      Key: {
        id: { S: reservationId },
        customerId: { S: customerId },
      },
    }).promise();

    return buildApiResponse(200, toResponse(reservation.Item));
  };

  return add500Handler(handler);
}