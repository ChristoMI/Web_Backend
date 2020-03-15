export const customer = {
  id: '3d527de1-09f8-4c1f-b0d0-37de565e28a4',
  username: 'username',
  email: 'test@gmail.com',
  firstName: 'first-name',
  lastName: 'last-name',
  avatarUrl: 'avatar-url',
};

export const customerPostConfirmationEvent = {
  version: '1',
  region: 'region',
  userPoolId: 'user-pool-id',
  userName: customer.username,
  callerContext: {
    awsSdkVersion: 'aws-sdk-version',
    clientId: 'client-id',
  },
  triggerSource: 'trigger-source',
  request: {
    userAttributes: {
      sub: customer.id,
      identities: 'identities',
      'cognito:user_status': 'EXTERNAL_PROVIDER',
      given_name: customer.firstName,
      family_name: customer.lastName,
      picture: customer.avatarUrl,
      email: customer.email,
    },
  },
  response: {},
};

export const host = {
  id: '3d527de1-09f8-4c1f-b0d0-37de565e28a4',
  username: 'username',
  email: 'test@gmail.com',
  firstName: 'first-name',
  lastName: 'last-name',
  avatarUrl: 'avatar-url',
};

export const hostPostConfirmationEvent = {
  version: '1',
  region: 'region',
  userPoolId: 'user-pool-id',
  userName: host.username,
  callerContext: {
    awsSdkVersion: 'aws-sdk-version',
    clientId: 'client-id',
  },
  triggerSource: 'trigger-source',
  request: {
    userAttributes: {
      sub: host.id,
      identities: 'identities',
      'cognito:user_status': 'EXTERNAL_PROVIDER',
      given_name: host.firstName,
      family_name: host.lastName,
      picture: host.avatarUrl,
      email: host.email,
    },
  },
  response: {},
};

export function createRequest({
  body = {},
  pathParameters = {},
  sub = '',
}) {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: '',
    isBase64Encoded: false,
    path: '',
    pathParameters,
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {
      accountId: '',
      apiId: '',
      authorizer: sub ? {
        claims: {
          sub,
        },
      } : null,
      connectedAt: 0,
      connectionId: '',
      domainName: '',
      domainPrefix: '',
      eventType: '',
      extendedRequestId: '',
      httpMethod: '',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '',
        user: null,
        userAgent: null,
        userArn: null,
      },
      messageDirection: '',
      messageId: '',
      path: '',
      stage: '',
      requestId: '',
      requestTime: '',
      requestTimeEpoch: 2,
      resourceId: '',
      resourcePath: '',
      routeKey: '',
    },
    resource: '',
  };
};