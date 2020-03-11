import 'module-alias/register'; // for alias

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import { Route } from '@pulumi/awsx/apigateway/api';
import { testRouteGet, testRouteCreate } from './src/routes/testRoute';

import {
  propertyInsert, propertyUpdate, propertyGetById, propertiesGet, STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY,
} from './src/routes/propertiesRoute';
import * as commentsRoutes from '$src/routes/comments';

import './infrastructure/dynamodb';
import { staticBucket, staticDomain } from './infrastructure/staticContent';


const stackConfig = new pulumi.Config('site');
const domain = stackConfig.require('domain');
const certArn = stackConfig.require('certificateArn');

const variables = {
  [STATIC_BUCKET_ENV_KEY]: staticBucket,
  [STATIC_DOMAIN_ENV_KEY]: staticDomain,
  AnalysisServerUrl: 'http://54.214.143.113:80',
};

const environment = {
  variables,
};

const customersUserPool = new aws.cognito.UserPool('booking-user-pool-customers', {
  autoVerifiedAttributes: ['email'],
});

const hostsUserPool = new aws.cognito.UserPool('booking-user-pool-hosts', {
  autoVerifiedAttributes: ['email'],
});

const customersUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-customers', {
  allowedOauthFlows: ['code'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid'],
  callbackUrls: ['http://localhost:3000'],
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO'],
  userPoolId: customersUserPool.id,
});

const hostsUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-hosts', {
  allowedOauthFlows: ['code'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid'],
  callbackUrls: ['http://localhost:3000'],
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO'],
  userPoolId: hostsUserPool.id,
});

const customersUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-customers', {
  domain: 'booking-user-pool-domain',
  userPoolId: customersUserPool.id,
});

const hostsUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-hosts', {
  domain: 'booking-user-pool-domain',
  userPoolId: hostsUserPool.id,
});

const cognitoAuthorizerCustomers = awsx.apigateway.getCognitoAuthorizer({ authorizerName: 'CognitoAuthorizerCustomers', providerARNs: [customersUserPool] });
const cognitoAuthorizerHosts = awsx.apigateway.getCognitoAuthorizer({ authorizerName: 'CognitoAuthorizerHosts', providerARNs: [hostsUserPool] });

let routes: Route[] = [{
  path: '/test/{id}',
  method: 'GET',
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  authorizers: cognitoAuthorizerCustomers,
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
  path: '/properties',
  method: 'GET',
  eventHandler: new aws.lambda.CallbackFunction('propertiesGet', {
    callbackFactory: propertiesGet,
    reservedConcurrentExecutions: 1,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
  }),
},
{
  path: '/properties/{id}',
  method: 'GET',
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyGetById', {
    callbackFactory: propertyGetById,
    reservedConcurrentExecutions: 1,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
  }),
},
{
  path: '/properties',
  method: 'POST',
  eventHandler: new aws.lambda.CallbackFunction('propertyInsert', {
    callbackFactory: propertyInsert,
    reservedConcurrentExecutions: 1,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
  }),
},
{
  path: '/properties/{id}',
  method: 'PUT',
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyUpdate', {
    callbackFactory: propertyUpdate,
    reservedConcurrentExecutions: 1,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
  }),
},
{
  path: '/properties/{id}/comments',
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
    environment,
  }),
},
{
  path: '/properties/{id}/comments',
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
    environment,
  }),
},
];

function addCors(routes: Route[]) {
  const corslambda = new aws.lambda.CallbackFunction<awsx.apigateway.Request, awsx.apigateway.Response>('corsLambda', {
    callback: async (e) => ({
      statusCode: 200,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      },
    }),
    reservedConcurrentExecutions: 1,
  });

  const newRoutes = Array.from(routes);

  for (const route of routes) {
    newRoutes.push({
      method: 'OPTIONS',
      path: route.path,
      eventHandler: corslambda,
    });
  }

  return newRoutes;
}

routes = addCors(routes);

const api = new awsx.apigateway.API('booking-api', {
  routes,
  stageArgs: {
    xrayTracingEnabled: true,
  },
});

const domainName = new aws.apigateway.DomainName('booking-domain', {
  domainName: domain,
  certificateArn: certArn,
});

const domainMapping = new aws.apigateway.BasePathMapping('booking-domain-mapping', {
  restApi: api.restAPI,
  domainName: domainName.domainName,
  stageName: api.stage.stageName,
});

export const customersUserPoolId = customersUserPool.id;
export const customersUserPoolName = customersUserPool.name;
export const customersUserPoolClientId = customersUserPoolClient.id;

export const hostsUserPoolId = hostsUserPool.id;
export const hostsUserPoolName = hostsUserPool.name;
export const hostsUserPoolClientId = hostsUserPoolClient.id;

export const url = api.url;
export const staticBucketName = staticBucket;