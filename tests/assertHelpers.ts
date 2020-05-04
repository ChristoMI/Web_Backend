import { expect } from 'chai';
import { apigateway } from '@pulumi/awsx';

export function assertOkResult(result: apigateway.Response) {
  expect(result.statusCode).to.be.equal(200, `Expected 200 response, but got: ${result.body}`);
}