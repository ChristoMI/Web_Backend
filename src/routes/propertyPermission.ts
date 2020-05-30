import { Property } from './properties/propertiesModel';
import { User } from './user';
import { buildApiResponse } from '$src/apiGatewayUtilities';

export function canSee(user: User, property: Property) {
  if (user.isAdmin) {
    return true;
  }

  if (user.userId === property.authorId) {
    return true;
  }

  if (property.isConfirmed) {
    return true;
  }

  return false;
}

export function insuficientPermissionsResult() {
  return buildApiResponse(403, {
    message: 'Current user does not have access to the property',
  });
}