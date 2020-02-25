/* eslint-disable no-undef */

import 'module-alias/register'; // for alias

import { expect } from 'chai';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import * as commentsRoutes from '$src/routes/comments';

import '../configTestEnvironment';

describe('comments', () => {
  before(() => {
    process.env.MLServerUrl = 'http://54.214.143.113:80';
  });

  const propertyId = '9623d2a9-2605-4fbe-82dc-40b5197a1566';

  it('should return new comment on create', async () => {
    const request = createRequestFromBlueprint({
      text: 'Horrible hotel, never will stay here again',
    }, {
      id: propertyId,
    });

    const result = await commentsRoutes.createPropertyComment()(request);

    expect(result.statusCode).to.be.equal(200);
  });

  it('should return comments by property id', async () => {
    const request = createRequestFromBlueprint({}, {
      id: propertyId,
    });

    const result = await commentsRoutes.getCommentsByPropertyId()(request);

    expect(result.statusCode).to.be.equal(200);
  });
});