import 'module-alias/register'; // for alias

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import { testRouteGet, testRouteCreate } from './src/routes/testRoute';

import * as commentsRoutes from '$src/routes/comments';

import './infrastructure/dynamodb';

const stackConfig = new pulumi.Config('site');
const domain = stackConfig.require('domain');
const certArn = stackConfig.require('certificateArn');

const api = new awsx.apigateway.API('booking-api', {
  routes: [
    {
      path: '/test/{id}',
      method: 'GET',
      requiredParameters: [
        { in: 'path', name: 'id' },
      ],
      eventHandler: new aws.lambda.CallbackFunction('testRouteGet', {
        callbackFactory: testRouteGet,
        reservedConcurrentExecutions: 1,
        tracingConfig: {
          mode: 'Active',
        },
      }),
    },
    {
      path: '/test',
      method: 'POST',
      eventHandler: new aws.lambda.CallbackFunction('testRouteCreate', {
        callbackFactory: testRouteCreate,
        reservedConcurrentExecutions: 1,
        tracingConfig: {
          mode: 'Active',
        },
      }),
    },
    {
      path: '/api/properties/{id}/comments',
      method: 'GET',
      requiredParameters: [{
        in: 'path',
        name: 'id',
      }],
      eventHandler: new aws.lambda.CallbackFunction('getCommentsByPropertyId', {
        callbackFactory: commentsRoutes.getCommentsByPropertyId,
        reservedConcurrentExecutions: 1,
        tracingConfig: {
          mode: 'Active',
        },
      }),
    },
    {
      path: '/api/properties/{id}/comments',
      method: 'POST',
      requiredParameters: [{
        in: 'path',
        name: 'id',
      }],
      eventHandler: new aws.lambda.CallbackFunction('createPropertyComment', {
        callbackFactory: commentsRoutes.createPropertyComment,
        reservedConcurrentExecutions: 1,
        tracingConfig: {
          mode: 'Active',
        },
      }),
    },
  ],
  stageArgs: {
    xrayTracingEnabled: true,
  },
});

const domainName = new aws.apigateway.DomainName('booking-domain', {
  domainName: domain,
  certificateArn: certArn,
});

// eslint-disable-next-line no-unused-vars
const domainMapping = new aws.apigateway.BasePathMapping('booking-domain-mapping', {
  restApi: api.restAPI,
  domainName: domainName.domainName,
  stageName: api.stage.stageName,
});

export const { url } = api;