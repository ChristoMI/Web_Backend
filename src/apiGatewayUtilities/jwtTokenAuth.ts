import * as Axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import * as AWS from 'aws-sdk';

export interface ClaimVerifyRequest {
  readonly token?: string;
}

export interface ClaimVerifyResult {
  readonly userName: string;
  readonly clientId: string;
  readonly isValid: boolean;
  readonly error?: any;
}

interface TokenHeader {
  kid: string;
  alg: string;
}
interface PublicKey {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}
interface PublicKeyMeta {
  instance: PublicKey;
  pem: string;
}

interface PublicKeys {
  keys: PublicKey[];
}

interface MapOfKidToPublicKey {
  [key: string]: PublicKeyMeta;
}

interface Claim {
  token_use: string;
  auth_time: number;
  iss: string;
  exp: number;
  username: string;
  client_id: string;
}


function cognitoIssuer() {
  const cognitoPoolId = process.env.COGNITO_POOL_ID || '';

  if (!cognitoPoolId) {
    throw new Error('env var required for cognito pool');
  }

  return `https://cognito-idp.${AWS.config.region!}.amazonaws.com/${cognitoPoolId}`;
}

let cacheKeys: MapOfKidToPublicKey | undefined;
const getPublicKeys = async (): Promise<MapOfKidToPublicKey> => {
  if (!cacheKeys) {
    const url = `${cognitoIssuer()}/.well-known/jwks.json`;
    const publicKeys = await Axios.default.get<PublicKeys>(url);
    cacheKeys = publicKeys.data.keys.reduce((agg, current: any) => {
      const pem = jwkToPem(current);
      // eslint-disable-next-line no-param-reassign
      agg[current.kid] = { instance: current, pem };
      return agg;
    }, {} as MapOfKidToPublicKey);
    return cacheKeys;
  }
  return cacheKeys;
};

const verifyToken = async (request: ClaimVerifyRequest): Promise<ClaimVerifyResult> => {
  let result: ClaimVerifyResult;
  try {
    const token = request.token;
    const tokenSections = (token || '').split('.');
    if (tokenSections.length < 2 || !token) {
      throw new Error('requested token is invalid');
    }
    const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
    const header = JSON.parse(headerJSON) as TokenHeader;
    const keys = await getPublicKeys();
    const key = keys[header.kid];
    if (key === undefined) {
      throw new Error('claim made for unknown kid');
    }

    const claim = jsonwebtoken.verify(token, key.pem) as Claim;
    const currentSeconds = Math.floor((new Date()).valueOf() / 1000);
    if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
      throw new Error('claim is expired or invalid');
    }
    if (claim.iss !== cognitoIssuer()) {
      throw new Error('claim issuer is invalid');
    }
    if (claim.token_use !== 'access') {
      throw new Error('claim use is not access');
    }

    result = { userName: claim.username, clientId: claim.client_id, isValid: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`FAILED TOKEN VALIDATION: ${error}`);
    result = {
      userName: '', clientId: '', error, isValid: false,
    };
  }
  return result;
};

// https://aws.amazon.com/premiumsupport/knowledge-center/decode-verify-cognito-json-token/
export async function extractUserIdFromToken(token: string) {
  const verified = await verifyToken({ token });

  if (verified.isValid) {
    return verified.clientId;
  }

  return undefined;
}