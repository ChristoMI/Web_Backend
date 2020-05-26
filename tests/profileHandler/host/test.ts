import 'module-alias/register'; // for alias

import { expect } from 'chai';

import '$tests/configTestEnvironment';
import { assertOkResult, assertResult } from '$tests/assertHelpers';

import routes = require('$src/routes/profile/host');
import stubs = require('../stubs');
import uuid = require('uuid');

describe('profile:host', () => {
  const newHostId = uuid();
  beforeEach(async () => {
    const newHost = {
      ...stubs.hostPostConfirmationEvent,
      request: {
        ...stubs.hostPostConfirmationEvent.request,
        userAttributes: {
          ...stubs.hostPostConfirmationEvent.request.userAttributes,
          sub: newHostId,
        },
      },
    };
    await routes.createProfile()(newHost, {}, () => {});
  });

  it('0 - should return host profile', async () => {
    const request = stubs.createRequest({
      sub: stubs.host.id,
    });

    const result = await routes.getProfile()(request);
    assertOkResult(result);

    const profile = JSON.parse(result.body);

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
        avatarBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        avatarFileName: 'image.png',
      },
    });

    const result = await routes.updateProfile()(request);
    assertOkResult(result);

    const profile = JSON.parse(result.body);

    expect(profile.id).to.be.equal(stubs.host.id);
    expect(profile.username).to.be.equal(stubs.host.username);
    expect(profile.email).to.be.equal(stubs.host.email);
    expect(profile.firstName).to.be.equal(newFirstName);
    expect(profile.lastName).to.be.equal(newLastName);
    expect(profile.avatarUrl).to.not.be.empty;
    expect(profile.avatarUrl).to.contain('image.png');
    expect(profile.avatarUrl).to.satisfy((s: string) => s.startsWith('https://'), result.body);
  });

  it('should mark host as admin', async () => {
    const markRequest = stubs.createRequest({
      sub: stubs.host.id,
      pathParameters: { hostId: newHostId },
      body: {
        isAdmin: true,
      },
    });
    const markResult = await routes.markAsAdmin()(markRequest);
    assertResult(markResult, 204);

    const request = stubs.createRequest({
      sub: newHostId,
    });
    const result = await routes.getProfile()(request);
    const profile = JSON.parse(result.body);

    expect(profile.id).to.be.equal(newHostId);
    expect(profile.isAdmin).to.be.equal(true);
  });

  it('should unmark host as admin', async () => {
    const markRequest = stubs.createRequest({
      sub: stubs.host.id,
      pathParameters: { hostId: newHostId },
      body: {
        isAdmin: true,
      },
    });
    await routes.markAsAdmin()(markRequest);
    markRequest.body = JSON.stringify({ isAdmin: false });
    const markResult = await routes.markAsAdmin()(markRequest);
    assertResult(markResult, 204);

    const request = stubs.createRequest({
      sub: newHostId,
    });
    const result = await routes.getProfile()(request);
    const profile = JSON.parse(result.body);

    expect(profile.id).to.be.equal(newHostId);
    expect(profile.isAdmin).to.be.equal(false);
  });

  it('should not mark host as admin if actor is not admin', async () => {
    const markRequest = stubs.createRequest({
      sub: newHostId,
      pathParameters: { hostId: stubs.host.id },
    });
    const markResult = await routes.markAsAdmin()(markRequest);
    assertResult(markResult, 403);
  });

  it('should list hosts if actor admin', async () => {
    const request = stubs.createRequest({
      sub: stubs.host.id,
    });
    const result = await routes.getAllProfiles()(request);
    assertResult(result, 200);

    const items: any[] = JSON.parse(result.body);
    expect(items.length).to.be.greaterThan(2);
    expect(items.find((i => i.id === stubs.host.id))).to.not.be.equal(undefined);
    expect(items.find((i => i.id === newHostId))).to.not.be.equal(undefined);
  });

  it('should not list hosts if actor not admin', async () => {
    const request = stubs.createRequest({
      sub: newHostId,
    });
    const result = await routes.getAllProfiles()(request);
    assertResult(result, 403);
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