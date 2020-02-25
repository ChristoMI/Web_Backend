import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { testRouteGet, testRouteCreate } from "./src/routes/testRoute";
import { propertyInsert, propertyUpdate, propertyGetById, propertiesGet, STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from "./src/routes/propertiesRoute";

import './infrastructure/dynamodb'
import { staticBucket, staticDomain } from './infrastructure/staticContent'
import { Route } from "@pulumi/awsx/apigateway/api";

const stackConfig = new pulumi.Config("site");
const domain = stackConfig.require("domain");
const certArn = stackConfig.require("certificateArn");

const variables = {
    [STATIC_BUCKET_ENV_KEY]: staticBucket,
    [STATIC_DOMAIN_ENV_KEY]: staticDomain
}

const environment = {
    variables
}

let routes: Route[] = [{
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
}]

function addCors(routes: Route[]) {
    const corslambda = new aws.lambda.CallbackFunction<awsx.apigateway.Request, awsx.apigateway.Response>("corsLambda", {
        callback: async (e) => ({
            statusCode: 200,
            body: '',
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        }),
        reservedConcurrentExecutions: 1
    })

    const newRoutes = Array.from(routes)
    
    for(const route of routes) {
        newRoutes.push({
            method: "OPTIONS",
            path: route.path,
            eventHandler: corslambda
        })
    }

    return newRoutes
}

routes = addCors(routes)

const api = new awsx.apigateway.API("booking-api", {
    routes: routes,
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

export const url = api.url
