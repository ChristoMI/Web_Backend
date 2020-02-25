import { expect } from 'chai'
import './../configTestEnvironment'
import {testRouteCreate, testRouteGet} from './../../src/routes/testRoute'
import {createRequestFromBlueprint} from './../testApiGatewayRequest'

describe('testRoute function', () => {
    it('should return new item on create', async () => {
      const result = await testRouteCreate()( createRequestFromBlueprint({}) )

      expect(result.statusCode).to.equal(200)
      expect(JSON.parse(result.body).id).to.not.be.empty
    })

    it('should return new item on get after create', async () => {
      const createResult = await testRouteCreate()( createRequestFromBlueprint({}) )
      const id = JSON.parse(createResult.body).id

      const getResult = await testRouteGet()( createRequestFromBlueprint({}, {id: id}))
      expect(getResult.statusCode).to.equal(200)
      expect(JSON.parse(getResult.body).id).to.be.equal(id)
    })

    it('should return 404 in random id', async () => {
      const result = await testRouteGet()( createRequestFromBlueprint({}, {id: Math.random()}) )
      expect(result.statusCode).to.be.equal(404)
    })
  })