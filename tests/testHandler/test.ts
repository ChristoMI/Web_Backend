/* eslint-disable no-undef */

import 'module-alias/register'; // for alias

import { expect } from 'chai';
import '../configTestEnvironment';
import { testRouteCreate, testRouteGet } from '../../src/routes/testRoute';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import * as commentsRoutes from '$src/routes/comments';

describe('testRoute function', () => {
  it('should return new item on create', async () => {
    const result = await testRouteCreate()(createRequestFromBlueprint({}));

    expect(result.statusCode).to.equal(200);
    // eslint-disable-next-line no-unused-expressions
    expect(JSON.parse(result.body).id).to.not.be.empty;
  });

  it('should return new item on get after create', async () => {
    const createResult = await testRouteCreate()(createRequestFromBlueprint({}));
    const { id } = JSON.parse(createResult.body);

    const getResult = await testRouteGet()(createRequestFromBlueprint({}, { id }));
    expect(getResult.statusCode).to.equal(200);
    expect(JSON.parse(getResult.body).id).to.be.equal(id);
  });

  it('should return 404 in random id', async () => {
    const result = await testRouteGet()(createRequestFromBlueprint({}, { id: Math.random() }));
    expect(result.statusCode).to.be.equal(404);
  });
});

describe('comments', () => {
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