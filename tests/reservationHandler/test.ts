import 'module-alias/register'; // for alias

import '$tests/configTestEnvironment';

import { expect } from 'chai';

import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/settings';

import * as reservationRoutes from '$src/routes/reservation';
import * as propertyRoutes from '$src/routes/properties/propertiesRoute';

import stubs = require('$tests/profileHandler/stubs');

describe('reservation', () => {
  const customerId = stubs.customer.id;

  before(() => {
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';
  });

  it('should return empty reservation list', async () => {
    const request = stubs.createRequest({
      sub: customerId,
    });

    const result = await reservationRoutes.getCustomerReservations()(request);

    const body = JSON.parse(result.body);

    expect(body).to.be.an('array');
    expect(result.statusCode).to.be.equal(200);
  });

  it('should return 404', async () => {
    const request = stubs.createRequest({
      pathParameters: {
        id: 'nonexistent-property-id',
      },
      queryStringParameters: {
        beginDate: new Date('2020-10-10'),
        endDate: new Date('2020-10-15'),
      },
    });

    const result = await reservationRoutes.getAvailableCountReservations()(request);

    expect(result.statusCode).to.be.equal(404);
  });

  it('should check available count reservations', async () => {
    const propertyResult = await propertyRoutes.propertyInsert()(stubs.createRequest({
      sub: customerId,
      body: {
        name: 'test-name',
        description: 'test-description',
        price: 200,
        totalRoomsNumber: 5,
      },
    }));

    const property = JSON.parse(propertyResult.body);

    const requestCreate = stubs.createRequest({
      sub: customerId,
      body: {
        propertyId: property.id,
        bookedRoomsNumber: 2,
        beginDate: new Date().setDate(new Date().getDate() + 1),
        endDate: new Date().setDate(new Date().getDate() + 5),
      },
    });

    await reservationRoutes.createReservation()(requestCreate);

    const request = stubs.createRequest({
      pathParameters: {
        id: property.id,
      },
      queryStringParameters: {
        beginDate: new Date().setDate(new Date().getDate() + 1),
        endDate: new Date().setDate(new Date().getDate() + 5),
      },
    });

    const result = await reservationRoutes.getAvailableCountReservations()(request);

    const body = JSON.parse(result.body);

    expect(body.availableRoomsCount).to.be.equal(3);
    expect(result.statusCode).to.be.equal(200);
  });

  it('should create reservation', async () => {
    const propertyResult = await propertyRoutes.propertyInsert()(stubs.createRequest({
      sub: customerId,
      body: {
        name: 'test-name',
        description: 'test-description',
        price: 200,
        totalRoomsNumber: 5,
      },
    }));

    const property = JSON.parse(propertyResult.body);

    const request = stubs.createRequest({
      sub: customerId,
      body: {
        propertyId: property.id,
        bookedRoomsNumber: 2,
        beginDate: new Date(),
        endDate: new Date().setDate(new Date().getDate() + 5),
      },
    });

    const result = await reservationRoutes.createReservation()(request);

    expect(result.statusCode).to.be.equal(200);
  });

  it('should delete reservation', async () => {
    const propertyResult = await propertyRoutes.propertyInsert()(stubs.createRequest({
      sub: customerId,
      body: {
        name: 'test-name',
        description: 'test-description',
        price: 200,
        totalRoomsNumber: 5,
      },
    }));

    const property = JSON.parse(propertyResult.body);

    const requestCreate = stubs.createRequest({
      sub: customerId,
      body: {
        propertyId: property.id,
        bookedRoomsNumber: 2,
        beginDate: new Date().setDate(new Date().getDate() + 1),
        endDate: new Date().setDate(new Date().getDate() + 5),
      },
    });

    const reservationResult = await reservationRoutes.createReservation()(requestCreate);

    const reservation = JSON.parse(reservationResult.body);

    const requestDelete = stubs.createRequest({
      sub: customerId,
      pathParameters: {
        id: reservation.id,
      },
    });

    const result = await reservationRoutes.deleteReservation()(requestDelete);

    expect(result.statusCode).to.be.equal(200);
  });

});