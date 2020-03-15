import 'module-alias/register'; // for alias

import { expect } from 'chai';

import routes = require('$src/routes/profile/host');
import stubs = require('../stubs');

import '$tests/configTestEnvironment';

describe('profile:host', () => {
  before(async () => {
    await routes.createProfile()(stubs.hostPostConfirmationEvent, {}, () => {});
  });

  it('should return host profile', async () => {
    const request = stubs.createRequest({
      sub: stubs.host.id,
    });

    const result = await routes.getProfile()(request);

    const profile = JSON.parse(result.body);

    expect(result.statusCode).to.be.equal(200);

    expect(profile.id).to.be.equal(stubs.host.id);
    expect(profile.username).to.be.equal(stubs.host.username);
    expect(profile.email).to.be.equal(stubs.host.email);
    expect(profile.firstName).to.be.equal(stubs.host.firstName);
    expect(profile.lastName).to.be.equal(stubs.host.lastName);
  });

  it('should return 404 error on get host profile', async () => {
    const request = stubs.createRequest({
      sub: '00000000-0000-0000-0000-000000000000',
    });

    const result = await routes.getProfile()(request);

    expect(result.statusCode).to.be.equal(404);
  });

  it('should return updated host profile', async () => {
    const newFirstName = 'NewFirstName';
    const newLastName = 'NewLastName';

    const request = stubs.createRequest({
      sub: stubs.host.id,
      body: {
        firstName: newFirstName,
        lastName: newLastName,
      },
    });

    const result = await routes.updateProfile()(request);

    const profile = JSON.parse(result.body);

    expect(result.statusCode).to.be.equal(200);

    expect(profile.id).to.be.equal(stubs.host.id);
    expect(profile.username).to.be.equal(stubs.host.username);
    expect(profile.email).to.be.equal(stubs.host.email);
    expect(profile.firstName).to.be.equal(newFirstName);
    expect(profile.lastName).to.be.equal(newLastName);
  });

  it('should return 404 error on update host profile', async () => {
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