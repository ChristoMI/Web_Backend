import { expect } from 'chai'
import './../configTestEnvironment'
import {testRouteCreate, testRouteGet} from './../../src/routes/testRoute'
import {createRequestFromBlueprint} from './../testApiGatewayRequest'
import { propertyInsert, propertyUpdate, propertyGetById, propertiesGet } from "./../../src/routes/propertiesRoute";

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

    it('should return new property on create', async () => {
      const result = await propertyInsert()( createRequestFromBlueprint({name: 'LOL', description: 'KEK'}))
      expect(result.statusCode).to.equal(200);
      expect(JSON.parse(result.body).id).to.not.be.empty;
      expect(JSON.parse(result.body).name).to.not.be.empty;
      expect(JSON.parse(result.body).description).to.not.be.empty;
      expect(JSON.parse(result.body).created_date).to.not.be.empty;
    });

    it('should return new property on get after create', async () => {
      const result = await propertyInsert()( createRequestFromBlueprint({name: '0_o', description: '(ノò_ó)ノ︵┻━┻'}))
      const id = JSON.parse(result.body).id
      const getResult = await propertyGetById()( createRequestFromBlueprint({}, {id: id}))
      expect(getResult.statusCode).to.equal(200);
      expect(JSON.parse(getResult.body).id).to.be.equal(id);
    });

    it('should return array of properties', async () => {
      const result = await propertiesGet()( createRequestFromBlueprint({}));
      expect(result.statusCode).to.equal(200);
      expect(JSON.parse(result.body)).to.be.an('array');
    });

    it('should update property after create', async () => {
      const postResult = await propertyInsert()( createRequestFromBlueprint({name: 'LOL', description: 'KEK'}))
      const id = JSON.parse(postResult.body).id;
      const putResult = await propertyUpdate()( createRequestFromBlueprint({name: 'Another LOL'}, {id: id}));
      expect(postResult.statusCode).to.equal(200);
      expect(putResult.statusCode).to.equal(200);
      expect(JSON.parse(putResult.body).name).to.be.equal('Another LOL');
      expect(JSON.parse(putResult.body).description).to.be.equal('KEK');
      expect(JSON.parse(putResult.body).created_date).to.be.equal(JSON.parse(postResult.body).created_date);
      
    });
  })