/* eslint-disable @typescript-eslint/no-unused-vars */
import * as aws from '@pulumi/aws';

const domain = new aws.elasticsearch.Domain('booking-domain', {
  clusterConfig: {
    instanceType: 't2.small.elasticsearch',
  },
  elasticsearchVersion: '7.4',
  ebsOptions: {
    ebsEnabled: true,
    volumeSize: 10,
  },
});

export const endpoint = domain.endpoint;