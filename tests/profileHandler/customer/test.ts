import 'module-alias/register'; // for alias

import { expect } from 'chai';

import routes = require('$src/routes/profile/customer');
import stubs = require('../stubs');

import '$tests/configTestEnvironment';

describe('profile:customer', () => {
  before(async () => {
    await routes.createProfile()(stubs.customerPostConfirmationEvent, {}, () => {});
  });

  it('should return customer profile', async () => {
    const request = stubs.createRequest({
      sub: stubs.customer.id,
    });

    const result = await routes.getProfile()(request);

    const profile = JSON.parse(result.body);

    expect(result.statusCode).to.be.equal(200);

    expect(profile.id).to.be.equal(stubs.customer.id);
    expect(profile.username).to.be.equal(stubs.customer.username);
    expect(profile.email).to.be.equal(stubs.customer.email);
    expect(profile.firstName).to.be.equal(stubs.customer.firstName);
    expect(profile.lastName).to.be.equal(stubs.customer.lastName);
  });

  it('should return 404 error on get customer profile', async () => {
    const request = stubs.createRequest({
      sub: '00000000-0000-0000-0000-000000000000',
    });

    const result = await routes.getProfile()(request);

    expect(result.statusCode).to.be.equal(404);
  });

  it('should return updated customer profile', async () => {
    const newFirstName = 'NewFirstName';
    const newLastName = 'NewLastName';

    const request = stubs.createRequest({
      sub: stubs.customer.id,
      body: {
        firstName: newFirstName,
        lastName: newLastName,
      },
    });

    const result = await routes.updateProfile()(request);

    const profile = JSON.parse(result.body);

    expect(result.statusCode).to.be.equal(200);

    expect(profile.id).to.be.equal(stubs.customer.id);
    expect(profile.username).to.be.equal(stubs.customer.username);
    expect(profile.email).to.be.equal(stubs.customer.email);
    expect(profile.firstName).to.be.equal(newFirstName);
    expect(profile.lastName).to.be.equal(newLastName);
  });

  it('should return 404 error on update customer profile', async () => {
    const newFirstName = 'NewFirstName';
    const newLastName = 'NewLastName';

    const request = stubs.createRequest({
      sub: '00000000-0000-0000-0000-000000000000',
      body: {
        firstName: newFirstName,
        lastName: newLastName,
      },
    });

    const result = await routes.updateProfile()(request);

    expect(result.statusCode).to.be.equal(404);
  });
});