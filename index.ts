/* eslint-disable @typescript-eslint/no-unused-vars */
import 'module-alias/register'; // for alias

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import { Route } from '@pulumi/awsx/apigateway/api';
import { testRouteGet, testRouteCreate } from './src/routes/testRoute';

import {
  propertyInsert, propertyUpdate, propertyRate, propertyGetById, propertiesGet,
  propertyAddImage, propertyRemoveImage, propertyReorderImages, propertyConfirm,
} from './src/routes/properties/propertiesRoute';
import * as commentsRoutes from '$src/routes/comments';
import * as profileRoutes from '$src/routes/profile';
import * as reservationRoutes from '$src/routes/reservation';

import * as import_esExports from './infrastructure/elasticsearch';
import './infrastructure/dynamodb';
import { staticBucket, staticDomain } from './infrastructure/staticContent';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/settings';
import { defaultMemorySize, defaultConcurrentExecutions } from './infrastructure/lambdaDefaults';


const stackConfig = new pulumi.Config('site');
const domain = stackConfig.require('domain');
const certArn = stackConfig.require('certificateArn');
const googleClientId = stackConfig.require('googleClientId');
const googleClientSecret = stackConfig.require('googleClientSecret');

const variables = {
  [STATIC_BUCKET_ENV_KEY]: staticBucket,
  [STATIC_DOMAIN_ENV_KEY]: staticDomain,
  AnalysisServerUrl: 'http://109.207.196.238:5555',
};

const environment = {
  variables,
};

const customerPostConfirmationLambda = new aws.lambda.CallbackFunction('createCustomerProfile', {
  callbackFactory: profileRoutes.customer.createProfile,
  reservedConcurrentExecutions: defaultConcurrentExecutions,
  tracingConfig: {
    mode: 'Active',
  },
  memorySize: defaultMemorySize,
});

const customersUserPool = new aws.cognito.UserPool('booking-user-pool-customers', {
  autoVerifiedAttributes: ['email'],
  lambdaConfig: {
    postConfirmation: customerPostConfirmationLambda.arn,
  },
});

const customerPostConfirmPermission = new aws.lambda.Permission('customerPostConfirmPermission', {
  action: 'lambda:InvokeFunction',
  function: customerPostConfirmationLambda,
  principal: 'cognito-idp.amazonaws.com',
  sourceArn: customersUserPool.arn,
});

const googleAuthProvider = new aws.cognito.IdentityProvider('google-customers-provider', {
  providerName: 'Google',
  userPoolId: customersUserPool.id,
  providerType: 'Google',
  providerDetails: {
    client_id: googleClientId,
    client_secret: googleClientSecret,
    authorize_scopes: 'profile email',
  },
  attributeMapping: {
    given_name: 'given_name',
    family_name: 'family_name',
    picture: 'picture',
    email: 'email',
  },
});

const hostPostConfirmationLambda = new aws.lambda.CallbackFunction('createHostProfile', {
  callbackFactory: profileRoutes.host.createProfile,
  reservedConcurrentExecutions: defaultConcurrentExecutions,
  tracingConfig: {
    mode: 'Active',
  },
  memorySize: defaultMemorySize,
});

const hostsUserPool = new aws.cognito.UserPool('booking-user-pool-hosts', {
  autoVerifiedAttributes: ['email'],
  lambdaConfig: {
    postConfirmation: hostPostConfirmationLambda.arn,
  },
});

const hostPostConfirmPermission = new aws.lambda.Permission('hostPostConfirmPermission', {
  action: 'lambda:InvokeFunction',
  function: hostPostConfirmationLambda,
  principal: 'cognito-idp.amazonaws.com',
  sourceArn: hostsUserPool.arn,
});

const callbackUrls = [
  'http://localhost:3000',
  'https://landing.booking.knine.xyz/swagger/oauth2-redirect.html',
  'https://auth.expo.io/@bbehrang/Bookingdesc',
  'https://auth.expo.io/@bbehrang/BookingKPI',
];

const customersUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-customers', {
  allowedOauthFlows: ['code', 'implicit'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid', 'profile'],
  callbackUrls,
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO', 'Google'],
  userPoolId: customersUserPool.id,
});

const hostsUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-hosts', {
  allowedOauthFlows: ['code', 'implicit'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid', 'profile'],
  callbackUrls,
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO'],
  userPoolId: hostsUserPool.id,
});

const customersUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-customers', {
  domain: 'booking-user-pool-domain-customer',
  userPoolId: customersUserPool.id,
}, {
  deleteBeforeReplace: true,
});

const hostsUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-hosts', {
  domain: 'booking-user-pool-domain-host',
  userPoolId: hostsUserPool.id,
}, {
  deleteBeforeReplace: true,
});

const cognitoAuthorizerCustomers = awsx.apigateway.getCognitoAuthorizer({
  authorizerName: 'CognitoAuthorizerCustomers',
  providerARNs: [customersUserPool],
});
const cognitoAuthorizerHosts = awsx.apigateway.getCognitoAuthorizer({
  authorizerName: 'CognitoAuthorizerHosts',
  providerARNs: [hostsUserPool],
});

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
  path: '/customers/profile',
  method: 'GET',
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('getCustomerProfile', {
    callbackFactory: profileRoutes.customer.getProfile,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/customers/profile',
  method: 'PUT',
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('updateCustomerProfile', {
    callbackFactory: profileRoutes.customer.updateProfile,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/hosts/profile',
  method: 'GET',
  authorizers: cognitoAuthorizerHosts,
  eventHandler: new aws.lambda.CallbackFunction('getHostProfile', {
    callbackFactory: profileRoutes.host.getProfile,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/hosts/profile',
  method: 'PUT',
  authorizers: cognitoAuthorizerHosts,
  eventHandler: new aws.lambda.CallbackFunction('updateHostProfile', {
    callbackFactory: profileRoutes.host.updateProfile,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/hosts',
  method: 'GET',
  authorizers: cognitoAuthorizerHosts,
  eventHandler: new aws.lambda.CallbackFunction('getAllProfiles', {
    callbackFactory: profileRoutes.host.getAllProfiles,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/hosts/{hostId}/markAdmin',
  method: 'PUT',
  authorizers: cognitoAuthorizerHosts,
  requiredParameters: [{
    in: 'path',
    name: 'hostId',
  }],
  eventHandler: new aws.lambda.CallbackFunction('markHostAsAdmin', {
    callbackFactory: profileRoutes.host.markAsAdmin,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties',
  method: 'GET',
  eventHandler: new aws.lambda.CallbackFunction('propertiesGet', {
    callbackFactory: propertiesGet,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment: { variables: { ...environment.variables, COGNITO_POOL_ID: hostsUserPool.id } },
    memorySize: defaultMemorySize,
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
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/rate',
  method: 'PUT',
  requiredParameters: [{
    in: 'path',
    name: 'id',
  }],
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('propertyRate', {
    callbackFactory: propertyRate,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/confirm',
  method: 'PUT',
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyConfirm', {
    callbackFactory: propertyConfirm,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties',
  method: 'POST',
  authorizers: cognitoAuthorizerHosts,
  eventHandler: new aws.lambda.CallbackFunction('propertyInsert', {
    callbackFactory: propertyInsert,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}',
  method: 'PUT',
  authorizers: cognitoAuthorizerHosts,
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyUpdate', {
    callbackFactory: propertyUpdate,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/images',
  method: 'POST',
  authorizers: cognitoAuthorizerHosts,
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyAddImage', {
    callbackFactory: propertyAddImage,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/images/{imageId}',
  method: 'DELETE',
  authorizers: cognitoAuthorizerHosts,
  requiredParameters: [
    { in: 'path', name: 'id' },
    { in: 'path', name: 'imageId' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyRemoveImage', {
    callbackFactory: propertyRemoveImage,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/images/order',
  method: 'PUT',
  authorizers: cognitoAuthorizerHosts,
  requiredParameters: [
    { in: 'path', name: 'id' },
  ],
  eventHandler: new aws.lambda.CallbackFunction('propertyReorderImages', {
    callbackFactory: propertyReorderImages,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
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
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/comments',
  method: 'POST',
  requiredParameters: [{
    in: 'path',
    name: 'id',
  }],
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('createPropertyComment', {
    callbackFactory: commentsRoutes.createPropertyComment,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/reservation',
  method: 'POST',
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('createReservation', {
    callbackFactory: reservationRoutes.createReservation,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/reservation/{id}',
  method: 'DELETE',
  requiredParameters: [{
    in: 'path',
    name: 'id',
  }],
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('deleteReservation', {
    callbackFactory: reservationRoutes.deleteReservation,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/customers/reservation',
  method: 'GET',
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('getCustomerReservations', {
    callbackFactory: reservationRoutes.getCustomerReservations,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
{
  path: '/properties/{id}/reservation/available-count',
  method: 'GET',
  requiredParameters: [{
    in: 'path',
    name: 'id',
  }, {
    in: 'query',
    name: 'beginDate',
  }, {
    in: 'query',
    name: 'endDate',
  }],
  authorizers: cognitoAuthorizerCustomers,
  eventHandler: new aws.lambda.CallbackFunction('getAvailableCountReservations', {
    callbackFactory: reservationRoutes.getAvailableCountReservations,
    reservedConcurrentExecutions: defaultConcurrentExecutions,
    tracingConfig: {
      mode: 'Active',
    },
    environment,
    memorySize: defaultMemorySize,
  }),
},
];

function addCors(corsRoutes: Route[]) {
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
    reservedConcurrentExecutions: 5,
  });

  const newRoutes = Array.from(corsRoutes);

  for (const route of corsRoutes) {
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

const unauthorizedResponseWithCors = new aws.apigateway.Response('unauthorizedResponseWithCors', {
  responseParameters: {
    'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
    'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'",
  },
  responseType: 'UNAUTHORIZED',
  restApiId: api.restAPI.id,
  statusCode: '401',
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

export const esExports = import_esExports;