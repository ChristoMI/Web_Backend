/* eslint-disable no-undef */

import 'module-alias/register';
import { expect } from 'chai';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import * as commentsRoutes from '$src/routes/comments';
import { propertyInsert } from '$src/routes/properties/propertiesRoute';
import AnalysisService from '$src/services/AnalysisService';
import { getMoodType } from '$src/routes/comments/moodTypeConversion';


import '../configTestEnvironment';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/settings'; // for alias

import sinon = require('sinon');

import customerRoutes = require('$src/routes/profile/customer');
import stubs = require('../profileHandler/stubs');

describe('comments', () => {
  before(async () => {
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';

    sinon.stub(AnalysisService.prototype, 'getCommentMood')
      .returns(Promise.resolve({
        neg: 0,
        neu: 0,
        pos: 0,
        compound: 0,
      }));

    await customerRoutes.createProfile()(stubs.customerPostConfirmationEvent, {}, () => {});
  });

  function createComment(propertyId: string, text: string) {
    const request = createRequestFromBlueprint({
      text,
    }, {
      id: propertyId,
    }, stubs.customer.id);

    return commentsRoutes.createPropertyComment()(request);
  }

  it('should return positive mood', () => {
    expect(getMoodType(0.05)).to.equal('positive');
    expect(getMoodType(0.06)).to.equal('positive');
  });

  it('should return negative mood', () => {
    expect(getMoodType(-0.05)).to.equal('negative');
    expect(getMoodType(-0.06)).to.equal('negative');
  });

  it('should return neutral mood', () => {
    expect(getMoodType(-0.049)).to.equal('neutral');
    expect(getMoodType(+0.049)).to.equal('neutral');
  });

  it('should return 404 error on create', async () => {
    const result = await createComment('9623d2a9-2605-4fbe-82dc-40b5197a1566', 'Horrible hotel, never will stay here again');

    expect(result.statusCode).to.be.equal(404);
  });

  it('should return new comment on create', async () => {
    const data = await propertyInsert()(createRequestFromBlueprint({
      name: 'name',
      description: 'description',
    }));

    const propertyId = JSON.parse(data.body).id;

    const text = 'Horrible hotel, never will stay here again';

    const result = await createComment(propertyId, text);
    const comment = JSON.parse(result.body);

    expect(result.statusCode).to.be.equal(200);

    expect(comment.id).to.not.be.empty;
    expect(comment.text).to.be.equal(text);
    expect(comment.propertyId).to.be.equal(propertyId);
    expect(comment.author).to.not.be.empty;
    expect(comment.author.id).to.be.equal(stubs.customer.id);
    expect(comment.author.firstName).to.be.equal(stubs.customer.firstName);
    expect(comment.author.lastName).to.be.equal(stubs.customer.lastName);
    expect(comment.author.avatarUrl).to.be.equal(stubs.customer.avatarUrl);
    expect(comment.moodType).to.be.equal('neutral');
    expect(comment.createdDate).to.not.be.empty;
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

    await createComment(propertyId, 'Horrible hotel, never will stay here again');

    const request3 = createRequestFromBlueprint({}, {
      id: propertyId,
    });

    const result = await commentsRoutes.getCommentsByPropertyId()(request3);

    expect(result.statusCode).to.be.equal(200);
    expect(JSON.parse(result.body)).to.be.an('array');
  });
});