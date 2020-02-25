import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { testRouteGet, testRouteCreate } from "./src/routes/testRoute";
import { propertyInsert, propertyUpdate, propertyGetById, propertiesGet, STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from "./src/routes/propertiesRoute";

import './infrastructure/dynamodb'
import { staticBucket, staticDomain } from './infrastructure/staticContent'

const stackConfig = new pulumi.Config("site");
const domain = stackConfig.require("domain");
const certArn = stackConfig.require("certificateArn");

const variables = {
    STATIC_BUCKET_ENV_KEY: staticBucket,
    STATIC_DOMAIN_ENV_KEY: staticDomain
}

const environment = {
    variables
}

const api = new awsx.apigateway.API("booking-api", {
    routes: [{
        path: "/test/{id}",
        method: "GET",
        requiredParameters: [
            { in: "path", name: "id" }
        ],
        eventHandler: new aws.lambda.CallbackFunction("testRouteGet", {
            callbackFactory: testRouteGet,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            }
        })
    },
    {
        path: "/test",
        method: "POST",
        eventHandler: new aws.lambda.CallbackFunction("testRouteCreate", {
            callbackFactory: testRouteCreate,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            }
        })
    },
    {
        path: "/properties",
        method: "GET",
        eventHandler: new aws.lambda.CallbackFunction("propertiesGet", {
            callbackFactory: propertiesGet,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            },
            environment
        })
    },
    {
        path: "/properties/{id}",
        method: "GET",
        requiredParameters: [
            { in: "path", name: "id" }
        ],
        eventHandler: new aws.lambda.CallbackFunction("propertyGetById", {
            callbackFactory: propertyGetById,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            },
            environment
        })
    },
    {
        path: "/properties",
        method: "POST",
        eventHandler: new aws.lambda.CallbackFunction("propertyInsert", {
            callbackFactory: propertyInsert,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            },
            environment
        })
    },
    {
        path: "/properties/{id}",
        method: "PUT",
        requiredParameters: [
            { in: "path", name: "id" }
        ],
        eventHandler: new aws.lambda.CallbackFunction("propertyUpdate", {
            callbackFactory: propertyUpdate,
            reservedConcurrentExecutions: 1,
            tracingConfig: {
                mode: 'Active'
            },
            environment
        })
    }],
    stageArgs: {
        xrayTracingEnabled: true
    }
})

const domainName = new aws.apigateway.DomainName("booking-domain", {
    domainName: domain,
    certificateArn: certArn,
})
const domainMapping = new aws.apigateway.BasePathMapping("booking-domain-mapping", {
    restApi: api.restAPI,
    domainName: domainName.domainName,
    stageName: api.stage.stageName,
});

const userPool = new aws.cognito.UserPool("userPool", {
    autoVerifiedAttributes: ["email"],
});

const userPoolClient = new aws.cognito.UserPoolClient("userPoolClient", {
    allowedOauthFlows: ["code"],
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthScopes: ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"],
    // callbackUrls: ["http://localhost:3000", "https://myapp.com"],
    // defaultRedirectUri: "https://myapp.com",
    generateSecret: false,
    // logoutUrls: ["http://localhost:3000", "https://myapp.com"],
    supportedIdentityProviders: ["COGNITO"],
    userPoolId: userPool.id,
});

const userPoolDomain = new aws.cognito.UserPoolDomain("userPoolDomain", {
    domain: "mybff",
    userPoolId: userPool.id,
});


const cognitoIdentityProvider = new aws.cognito.IdentityProvider(userPool.endpoint.toString(), {
    providerDetails: { "client_id": "123" },
    userPoolId: userPool.id,
    providerType: "Cognito",
    providerName: "identityProvider",
  });

const identityPool = new aws.cognito.IdentityPool("identityPool", {
    allowUnauthenticatedIdentities: true,
    cognitoIdentityProviders: [cognitoIdentityProvider],
    identityPoolName: "identityPool",
});

const identityPoolAuthenticatedRole = new aws.iam.Role("identityPoolAuthenticatedRole", {
    assumeRolePolicy: identityPool.id.apply(id => JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "cognito-identity.amazonaws.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": id
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    }
                }
            }
        ]
    })),
});

const identityPoolAuthenticatedRolePolicy = new aws.iam.RolePolicy("identityPoolAuthenticatedRolePolicy", {
    policy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "mobileanalytics:PutEvents",
                    "cognito-sync:*",
                    "cognito-identity:*"
                ],
                "Resource": [
                    "*"
                ]
            }
        ]
    }),
    role: identityPoolAuthenticatedRole.id,
});

const identityPoolUnauthenticatedRole = new aws.iam.Role("identityPoolUnauthenticatedRole", {
    assumeRolePolicy: identityPool.id.apply(id => JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "cognito-identity.amazonaws.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": id
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "unauthenticated"
                    }
                }
            }
        ]
    })),
});

const identityPoolUnauthenticatedRolePolicy = new aws.iam.RolePolicy("identityPoolUnauthenticatedRolePolicy", {
    policy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "mobileanalytics:PutEvents",
                    "cognito-sync:*",
                ],
                "Resource": [
                    "*"
                ]
            }
        ]
    }),
    role: identityPoolUnauthenticatedRole.id,
});

const identityPoolRoleAttachment = new aws.cognito.IdentityPoolRoleAttachment("identityPoolRoleAttachment", {
    identityPoolId: identityPool.id,
    roles: {
        authenticated: identityPoolAuthenticatedRole.arn,
        unauthenticated: identityPoolUnauthenticatedRole.arn,
    },
});

export const userPoolId = userPool.id;
export const userPoolName = userPool.name;
export const userPoolClientId = userPoolClient.id;
export const identityPoolId = identityPool.id;
export const url = api.url
