import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { testRouteGet, testRouteCreate } from "./src/routes/testRoute";
import { propertyInsert, propertyUpdate, propertyGetById, propertiesGet } from "./src/routes/propertiesRoute";

import './infrastructure/dynamodb'

const stackConfig = new pulumi.Config("site");
const domain = stackConfig.require("domain");
const certArn = stackConfig.require("certificateArn");

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
            }
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
            }
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
            }
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
            }
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

export const url = api.url
