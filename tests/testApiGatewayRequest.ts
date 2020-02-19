export function apiGatewayWithBody(body: object) {
    return {
        body: JSON.stringify(body),
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
          path: 'string',
          stage: 'string',
          requestId: 'string',
          requestTimeEpoch: 2,
          resourceId: 'string',
          resourcePath: 'string'
        },
        stageVariables: {},
        resource: ''
    }
}