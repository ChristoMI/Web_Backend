import { expect } from 'chai'
import './../configTestEnvironment'
import {testRouteHandler} from './../../src/routes/testRoute'
import {apiGatewayWithBody} from './../testApiGatewayRequest'


describe('Hello function', () => {
    it('should return hello world', () => {
      const result = testRouteHandler( apiGatewayWithBody({d: 'd'}) )
      return result.then((r) => {
          expect(r.statusCode).to.equal(200)
      })
    })
  })