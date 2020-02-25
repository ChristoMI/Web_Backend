import * as aws from '@pulumi/aws';

const dynamo = new aws.dynamodb.Table('test-stuff', {
  attributes: [{
    name: 'Id',
    type: 'S',
  }],
  readCapacity: 1,
  writeCapacity: 1,
  name: 'test-stuff',
  hashKey: 'Id',
  globalSecondaryIndexes: [{
    hashKey: 'Id',
    name: 'test-global-secondary',
    readCapacity: 1,
    writeCapacity: 1,
    projectionType: 'ALL',
  }],
});

export const testStuff = dynamo;

export const comment = new aws.dynamodb.Table('comment', {
  name: 'comment',
  rangeKey: 'id',
  hashKey: 'propertyId',
  attributes: [{
    name: 'id',
    type: 'S',
  }, {
    name: 'propertyId',
    type: 'S',
  }],
  readCapacity: 1,
  writeCapacity: 1,
});