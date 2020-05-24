/* eslint-disable @typescript-eslint/no-unused-vars */
import 'module-alias/register'; // for alias

import customerRoutes = require('$src/routes/profile/customer');
import hostRoutes = require('$src/routes/profile/host');
import stubs = require('./profileHandler/stubs');

before(async () => {
  await customerRoutes.createProfile()(stubs.customerPostConfirmationEvent, {}, () => {});
  await hostRoutes.createProfile()(stubs.hostPostConfirmationEvent, {}, () => {});
});