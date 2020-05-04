import { expect } from 'chai';
import '../configTestEnvironment';
import { createRequestFromBlueprint } from '../testApiGatewayRequest';
import {
  propertyInsert, propertyUpdate, propertyGetById, propertiesGet, propertyAddImage, propertyRemoveImage, propertyReorderImages,
} from '../../src/routes/properties/propertiesRoute';
import { STATIC_BUCKET_ENV_KEY, STATIC_DOMAIN_ENV_KEY } from '$src/routes/settings';

describe('propertiesRoute route', () => {
  before(() => {
    process.env[STATIC_BUCKET_ENV_KEY] = 'testbucket';
    process.env[STATIC_DOMAIN_ENV_KEY] = 'someweirdsite.weirddomain.weird';
  });

  it('should return new property on create', async () => {
    const result = await propertyInsert()(createRequestFromBlueprint({ name: 'LOL', description: 'KEK' }));
    expect(result.statusCode).to.equal(200);
    expect(JSON.parse(result.body).id).to.not.be.empty;
    expect(JSON.parse(result.body).name).to.not.be.empty;
    expect(JSON.parse(result.body).description).to.not.be.empty;
    expect(JSON.parse(result.body).created_date).to.not.be.empty;
  });

  it('can upload cover image', async () => {
    const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const filename = 'image.png';
    const result = await propertyInsert()(createRequestFromBlueprint({
      name: 'LOL', description: 'KEK', cover_image_base64: body, cover_image_file_name: filename,
    }));
    expect(result.statusCode).to.equal(200);
    expect(JSON.parse(result.body).id).to.not.be.empty;
    expect(JSON.parse(result.body).name).to.not.be.empty;
    expect(JSON.parse(result.body).description).to.not.be.empty;
    expect(JSON.parse(result.body).created_date).to.not.be.empty;
    expect(JSON.parse(result.body).cover_image_url).to.not.be.empty;
    expect(JSON.parse(result.body).cover_image_url).to.contain(filename);
    expect(JSON.parse(result.body).cover_image_url).to.satisfy((s: string) => s.startsWith('https://'), result.body);
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
      name: 'LOL', description: 'KEK', cover_image_base64: body, cover_image_file_name: filename,
    }));
    const id = JSON.parse(result.body).id;
    const getResult = await propertyGetById()(createRequestFromBlueprint({}, { id }));
    expect(getResult.statusCode).to.equal(200);
    expectUrlToBeOf(JSON.parse(getResult.body).cover_image_url, filename);
  });

  it('should return new property on get after create', async () => {
    const result = await propertyInsert()(createRequestFromBlueprint({ name: '0_o', description: '(ノò_ó)ノ︵┻━┻' }));
    const id = JSON.parse(result.body).id;
    const getResult = await propertyGetById()(createRequestFromBlueprint({}, { id }));
    expect(getResult.statusCode).to.equal(200);
    expect(JSON.parse(getResult.body).id).to.be.equal(id);
  });

  it('should return array of properties', async () => {
    const result = await propertiesGet()(createRequestFromBlueprint({}));
    expect(result.statusCode).to.equal(200);
    expect(JSON.parse(result.body)).to.be.an('array');
  });

  it('should update property after create', async () => {
    const postResult = await propertyInsert()(createRequestFromBlueprint({ name: 'LOL', description: 'KEK' }));
    const id = JSON.parse(postResult.body).id;
    const putResult = await propertyUpdate()(createRequestFromBlueprint({ name: 'Another LOL' }, { id }));
    expect(postResult.statusCode).to.equal(200);
    expect(putResult.statusCode).to.equal(200);
    expect(JSON.parse(putResult.body).name).to.be.equal('Another LOL');
    expect(JSON.parse(putResult.body).description).to.be.equal('KEK');
    expect(JSON.parse(putResult.body).created_date).to.be
      .equal(JSON.parse(postResult.body).created_date);
  });

  describe('property images', async () => {
    const filename = 'image.png';

    let propertyId = 0;
    let property: any = {};
    let createPropertyResponse: any = {};
    let createImageResponse: any = {};

    beforeEach(async () => {
      createPropertyResponse = await propertyInsert()(createRequestFromBlueprint({ name: 'LOL', description: 'KEK' }));
      propertyId = JSON.parse(createPropertyResponse.body).id;

      const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const reqBody = { image_base64: body, image_file_name: filename };
      createImageResponse = await propertyAddImage()(createRequestFromBlueprint(reqBody, { id: propertyId }));
      property = JSON.parse(createImageResponse.body);
    });

    it('should be able to add property image', () => {
      expect(createImageResponse.statusCode).to.equal(200);

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

      expect(removeImageResponse.statusCode).to.be.equal(200);

      const newProperty = JSON.parse(removeImageResponse.body);
      expect(newProperty.images).to.have.length(0);
    });

    it('should be able to reorder property images', async () => {
      const body = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const reqBody = { image_base64: body, image_file_name: filename };
      await propertyAddImage()(createRequestFromBlueprint(reqBody, { id: propertyId }));

      const reordered = [2, 1];
      const reorderResponse = await propertyReorderImages()(
        createRequestFromBlueprint({ imageIdsInOrder: reordered }, { id: propertyId }),
      );

      expect(reorderResponse.statusCode).to.be.equal(200);

      const newProperty = JSON.parse(reorderResponse.body);
      expect(newProperty.images).to.have.length(2);
      expect(newProperty.images.map((i: any) => i.id)).to.be.eql([2, 1]);
    });
  });
});