import { expect } from 'chai';
import { apigateway } from '@pulumi/awsx';

export function assertResult(result: apigateway.Response, code: number) {
  expect(result.statusCode).to.be.equal(code,
    `Expected ${code} response, but got ${result.statusCode}. Response body: ${result.body}`);
}

export function assertOkResult(result: apigateway.Response) {
  assertResult(result, 200);
}