import { expect } from 'chai';
import '../configTestEnvironment';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import {
  propertyInsert, propertyUpdate, propertyGetById, propertiesGet, propertyAddImage, propertyRemoveImage, propertyReorderImages,
} from '../../src/routes/properties/propertiesRoute';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/settings';
import { assertOkResult } from '$tests/assertHelpers';

describe('propertiesRoute route', () => {
  before(() => {
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';
  });

  it('should return new property on create', async () => {
    const result = await propertyInsert()(createRequestFromBlueprint({
      name: 'LOL',
      description: 'KEK',
      address: 'SOme street',
      opportunities: ['opp1', 'opp2'],
      landmarks: [{
        name: 'l1',
        distance: 12,
      }],
      price: 200,
    }));

    assertOkResult(result);

    const created = JSON.parse(result.body);

    expect(created.id).to.not.be.empty;
    expect(created.name).to.not.be.empty;
    expect(created.description).to.not.be.empty;
    expect(created.created_date).to.not.be.empty;
    expect(created.address).to.be.equal('SOme street');
    expect(created.opportunities).to.be.eql(['opp1', 'opp2']);
    expect(created.landmarks).to.be.eql([{ name: 'l1', distance: 12 }]);
    expect(created.price).to.be.equal(200);
  });

  it('can upload cover image', async () => {
    const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const filename = 'image.png';
    const result = await propertyInsert()(createRequestFromBlueprint({
      name: 'LOL',
      description: 'KEK',
      cover_image_base64: body,
      cover_image_file_name: filename,
      price: 200,
    }));

    assertOkResult(result);

    const created = JSON.parse(result.body);

    expect(created.id).to.not.be.empty;
    expect(created.name).to.not.be.empty;
    expect(created.description).to.not.be.empty;
    expect(created.created_date).to.not.be.empty;
    expect(created.cover_image_url).to.not.be.empty;
    expect(created.cover_image_url).to.contain(filename);
    expect(created.cover_image_url).to.satisfy((s: string) => s.startsWith('https://'), result.body);
  });

  function expectUrlToBeOf(url: string, filename: string) {
    expect(url).to.not.be.empty;
    expect(url).to.contain(filename);
    expect(url).to.satisfy((s: string) => s.startsWith('https://'));
  }

  it('can get cover image after upload', async () => {
    const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const filename = 'image.png';
    const result = await propertyInsert()(createRequestFromBlueprint({
      name: 'LOL', description: 'KEK', cover_image_base64: body, cover_image_file_name: filename, price: 200,
    }));

    assertOkResult(result);

    const id = JSON.parse(result.body).id;
    const getResult = await propertyGetById()(createRequestFromBlueprint({}, { id }));
    assertOkResult(getResult);

    expectUrlToBeOf(JSON.parse(getResult.body).cover_image_url, filename);
  });

  it('should return new property on get after create', async () => {
    const result = await propertyInsert()(createRequestFromBlueprint({ name: '0_o', description: '(ノò_ó)ノ︵┻━┻', price: 200 }));
    assertOkResult(result);

    const id = JSON.parse(result.body).id;
    const getResult = await propertyGetById()(createRequestFromBlueprint({}, { id }));
    assertOkResult(getResult);
    expect(JSON.parse(getResult.body).id).to.be.equal(id);
  });

  it('should return array of properties', async () => {
    const result = await propertiesGet()(createRequestFromBlueprint({}));
    assertOkResult(result);

    expect(JSON.parse(result.body)).to.be.an('array');
  });

  it('should update property after create', async () => {
    const postResult = await propertyInsert()(createRequestFromBlueprint({
      name: 'LOL',
      description: 'KEK',
      address: 'SOme street',
      opportunities: ['opp1', 'opp2'],
      landmarks: [{
        name: 'l1',
        distance: 12,
      }],
      price: 200,
    }));
    assertOkResult(postResult);

    const created = JSON.parse(postResult.body);

    const id = created.id;
    const putResult = await propertyUpdate()(createRequestFromBlueprint({
      name: 'Another LOL',
      address: 'SOme street1',
      opportunities: ['opp2'],
      landmarks: [{
        name: 'l2',
        distance: 12,
      }],
    }, { id }));
    assertOkResult(putResult);

    const updated = JSON.parse(putResult.body);

    expect(updated.name).to.be.equal('Another LOL');
    expect(updated.description).to.be.equal('KEK');
    expect(updated.created_date).to.be
      .equal(created.created_date);
    expect(updated.address).to.be.equal('SOme street1');
    expect(updated.opportunities).to.be.eql(['opp2']);
    expect(updated.landmarks).to.be.eql([{ name: 'l2', distance: 12 }]);
    expect(updated.price).to.be.equal(200);
  });

  describe('property images', async () => {
    const filename = 'image.png';

    let propertyId = 0;
    let property: any = {};
    let createPropertyResponse: any = {};
    let createImageResponse: any = {};

    beforeEach(async () => {
      createPropertyResponse = await propertyInsert()(
        createRequestFromBlueprint({ name: 'LOL', description: 'KEK', price: 200 }),
      );
      assertOkResult(createPropertyResponse);
      propertyId = JSON.parse(createPropertyResponse.body).id;

      const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const reqBody = { image_base64: body, image_file_name: filename };
      createImageResponse = await propertyAddImage()(createRequestFromBlueprint(reqBody, { id: propertyId }));
      assertOkResult(createImageResponse);
      property = JSON.parse(createImageResponse.body);
    });

    it('should be able to add property image', () => {
      expect(property.id).to.be.equal(propertyId);
      expect(property.name).to.be.equal('LOL');
      expect(property.description).to.be.equal('KEK');
      expect(property.created_date).to.be.equal(JSON.parse(createPropertyResponse.body).created_date);
      expect(property.images).to.have.length(1);
      expect(property.images[0].id).to.be.equal(1);
      expectUrlToBeOf(property.images[0].url, filename);
    });

    it('should be able to delete property image', async () => {
      const removeImageResponse = await propertyRemoveImage()(
        createRequestFromBlueprint({}, { id: propertyId, imageId: 1 }),
      );

      assertOkResult(removeImageResponse);

      const newProperty = JSON.parse(removeImageResponse.body);
      expect(newProperty.images).to.have.length(0);
    });

    it('should be able to reorder property images', async () => {
      const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const reqBody = { image_base64: body, image_file_name: filename };
      const addImgResponse = await propertyAddImage()(createRequestFromBlueprint(reqBody, { id: propertyId }));
      assertOkResult(addImgResponse);

      const reordered = [2, 1];
      const reorderResponse = await propertyReorderImages()(
        createRequestFromBlueprint({ imageIdsInOrder: reordered }, { id: propertyId }),
      );

      assertOkResult(reorderResponse);

      const newProperty = JSON.parse(reorderResponse.body);
      expect(newProperty.images).to.have.length(2);
      expect(newProperty.images.map((i: any) => i.id)).to.be.eql([2, 1]);
    });
  });
});