/* eslint-disable no-undef */

import 'module-alias/register'; // for alias

import { expect } from 'chai';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import * as commentsRoutes from '$src/routes/comments';
import { propertyInsert, STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/propertiesRoute';

import '../configTestEnvironment';

describe('comments', () => {
  before(() => {
    process.env.MLServerUrl = 'http://54.214.143.113:80';
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';
  });

  it('should return 404 error on create', async () => {
    const request = createRequestFromBlueprint({
      text: 'Horrible hotel, never will stay here again',
    }, {
      id: '9623d2a9-2605-4fbe-82dc-40b5197a1566',
    });

    const result = await commentsRoutes.createPropertyComment()(request);

    expect(result.statusCode).to.be.equal(404);
  });

  it('should return new comment on create', async () => {
    const data = await propertyInsert()(createRequestFromBlueprint({
      name: 'name',
      description: 'description',
    }));

    const propertyId = JSON.parse(data.body).id;

    const request = createRequestFromBlueprint({
      text: 'Horrible hotel, never will stay here again',
    }, {
      id: propertyId,
    });

    const result = await commentsRoutes.createPropertyComment()(request);

    expect(result.statusCode).to.be.equal(200);
  });

  it('should return 404 error on read comments', async () => {
    const request = createRequestFromBlueprint({}, {
      id: '9623d2a9-2605-4fbe-82dc-40b5197a1566',
    });

    const result = await commentsRoutes.getCommentsByPropertyId()(request);

    expect(result.statusCode).to.be.equal(404);
  });

  it('should return comments by property id', async () => {
    const data = await propertyInsert()(createRequestFromBlueprint({
      name: 'name',
      description: 'description',
    }));

    const propertyId = JSON.parse(data.body).id;

    const request = createRequestFromBlueprint({}, {
      id: propertyId,
    });

    const result = await commentsRoutes.getCommentsByPropertyId()(request);

    expect(result.statusCode).to.be.equal(200);
    expect(JSON.parse(result.body)).to.be.an('array');
  });
});