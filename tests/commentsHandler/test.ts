/* eslint-disable no-undef */

import 'module-alias/register'; // for alias

import sinon = require('sinon');
import { expect } from 'chai';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import * as commentsRoutes from '$src/routes/comments';
import { propertyInsert, STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/propertiesRoute';
import AnalysisService from '$src/services/AnalysisService';

import '../configTestEnvironment';

describe('comments', () => {
  before(() => {
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';

    sinon.stub(AnalysisService.prototype, 'getCommentMood')
      .returns(Promise.resolve({
        neg: 0,
        neu: 0,
        pos: 0,
        compound: 0,
      }));
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
    const request1 = createRequestFromBlueprint({
      name: 'name',
      description: 'description',
    });

    const data1 = await propertyInsert()(request1);

    const propertyId = JSON.parse(data1.body).id;

    const request2 = createRequestFromBlueprint({
      text: 'Horrible hotel, never will stay here again',
    }, {
      id: propertyId,
    });

    await commentsRoutes.createPropertyComment()(request2);

    const request3 = createRequestFromBlueprint({}, {
      id: propertyId,
    });

    const result = await commentsRoutes.getCommentsByPropertyId()(request3);

    expect(result.statusCode).to.be.equal(200);
    expect(JSON.parse(result.body)).to.be.an('array');
  });
});