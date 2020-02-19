import * as awsx from "@pulumi/awsx";

// Define our routes, independent from the API Gateway itself.
export async function testRouteHandler(
        event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> {
    return {
        statusCode: 200,
        body: "Hello, API Gateway!",
    };
}