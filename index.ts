import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { testRouteHandler } from "./src/routes/testRoute";

const stackConfig = new pulumi.Config("site");
const domain = stackConfig.require("domain");
const certArn = stackConfig.require("certificateArn");

const api = new awsx.apigateway.API("booking-api", {
    routes: [{
        path: "/test", 
        method: "GET", 
        eventHandler: new aws.lambda.CallbackFunction("testRouteHandler", {
            callback: testRouteHandler,
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

const db = new aws.dynamodb.Table("mytable", {
    attributes: [
        { name: "Id", type: "S" },
    ],
    hashKey: "Id",
    readCapacity: 1,
    writeCapacity: 1,
});

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
