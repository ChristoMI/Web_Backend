import 'module-alias/register'; // for alias

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import { Route } from '@pulumi/awsx/apigateway/api';
import { testRouteGet, testRouteCreate } from './src/routes/testRoute';

import {
  propertyInsert, propertyUpdate, propertyGetById, propertiesGet
} from './src/routes/propertiesRoute';
import * as commentsRoutes from '$src/routes/comments';
import * as profileRoutes from '$src/routes/profile';

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
  AnalysisServerUrl: 'http://54.214.143.113:80',
};

const environment = {
  variables,
};

const customerPostConfirmationLambda = new aws.lambda.CallbackFunction('createCustomerProfile', {
  callbackFactory: profileRoutes.customer.createProfile,
  reservedConcurrentExecutions: 1,
  tracingConfig: {
    mode: 'Active',
  },
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
  sourceArn: customersUserPool.arn
});

const googleAuthProvider = new aws.cognito.IdentityProvider('google-customers-provider', {
  providerName: 'Google',
  userPoolId: customersUserPool.id,
  providerType: 'Google',
  providerDetails: {
    client_id: googleClientId,
    client_secret: googleClientSecret,
    authorize_scopes: 'profile email'
  },
  attributeMapping: {
    'given_name': 'given_name',
    'family_name': 'family_name',
    'picture': 'picture',
    'email': 'email'
  }
})

const hostPostConfirmationLambda = new aws.lambda.CallbackFunction('createHostProfile', {
  callbackFactory: profileRoutes.host.createProfile,
  reservedConcurrentExecutions: 1,
  tracingConfig: {
    mode: 'Active',
  },
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
  sourceArn: hostsUserPool.arn
});

const customersUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-customers', {
  allowedOauthFlows: ['code', 'implicit'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid', 'profile'],
  callbackUrls: ['http://localhost:3000', 'https://landing.booking.knine.xyz/swagger/oauth2-redirect.html', 'https://auth.expo.io/@bbehrang/Bookingdesc'],
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO', 'Google'],
  userPoolId: customersUserPool.id,
});

const hostsUserPoolClient = new aws.cognito.UserPoolClient('booking-user-pool-client-hosts', {
  allowedOauthFlows: ['code', 'implicit'],
  allowedOauthFlowsUserPoolClient: true,
  allowedOauthScopes: ['phone', 'email', 'openid', 'profile'],
  callbackUrls: ['http://localhost:3000', 'https://landing.booking.knine.xyz/swagger/oauth2-redirect.html', 'https://auth.expo.io/@bbehrang/Bookingdesc'],
  generateSecret: false,
  supportedIdentityProviders: ['COGNITO'],
  userPoolId: hostsUserPool.id,
});

const customersUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-customers', {
  domain: 'booking-user-pool-domain-customer',
  userPoolId: customersUserPool.id,
}, {
  deleteBeforeReplace: true
});

const hostsUserPoolDomain = new aws.cognito.UserPoolDomain('booking-user-pool-domain-hosts', {
  domain: 'booking-user-pool-domain-host',
  userPoolId: hostsUserPool.id,
}, {
  deleteBeforeReplace: true
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    environment,
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    memorySize: defaultMemorySize
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
    reservedConcurrentExecutions: 5,
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
  }
});

const unauthorizedResponseWithCors = new aws.apigateway.Response("unauthorizedResponseWithCors", {
  responseParameters: {
      'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
      'gatewayresponse.header.Access-Control-Allow-Credentials': "'true'"
  },
  responseType: "UNAUTHORIZED",
  restApiId: api.restAPI.id,
  statusCode: "401",
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