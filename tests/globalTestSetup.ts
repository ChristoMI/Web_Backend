/* eslint-disable @typescript-eslint/no-unused-vars */
import 'module-alias/register';
import { createDynamo } from '$src/initAWS'; // for alias

import customerRoutes = require('$src/routes/profile/customer');
import hostRoutes = require('$src/routes/profile/host');
import stubs = require('./profileHandler/stubs');

before(async () => {
  await customerRoutes.createProfile()(stubs.customerPostConfirmationEvent, {}, () => {});
  await hostRoutes.createProfile()(stubs.hostPostConfirmationEvent, {}, () => {});

  // Make the host an admin
  await createDynamo().updateItem({
    TableName: 'host',
    Key: {
      id: { S: stubs.host.id },
    },
    ConditionExpression: 'id = :id',
    UpdateExpression: 'set isAdmin = :isAdmin',
    ExpressionAttributeValues: { ':isAdmin': { BOOL: true }, ':id': { S: stubs.host.id } },
  }).promise();
});