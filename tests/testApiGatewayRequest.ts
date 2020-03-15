import { insecure } from "@pulumi/aws/config"

const template = () => ({
    body: '',
    headers: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    multiValueHeaders: {},
    path: '',
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    requestContext: {
      accountId: 'string',
      apiId: 'string',
      httpMethod: 'string',
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
          sourceIp: 'string',
          user: null,
          userAgent: null,
          userArn: null,
      },
      authorizer: {
        sub: ''
      },
      path: 'string',
      stage: 'string',
      requestId: 'string',
      requestTimeEpoch: 2,
      resourceId: 'string',
      resourcePath: 'string'
    },
    stageVariables: {},
    resource: ''
})

export function createRequestFromBlueprint(body: object, pathParams = {}, sub = '') {
    let instance = template()
    instance.body = JSON.stringify(body)
    instance.pathParameters = pathParams
    instance.requestContext.authorizer.sub = sub;
    return instance
}