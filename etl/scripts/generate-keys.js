const crypto = require('crypto');

// 1. configuration
// This matches the JWT_SECRET in your docker .env
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-token-at-least-32-chars-long';

function sign(role) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    role: role,
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10), // 10 years expiration
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${b64Header}.${b64Payload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

console.log('--- SUPABASE KEYS GENERATOR ---');
console.log('JWT Secret used:', JWT_SECRET);
console.log('\nANON_KEY (public):');
console.log(sign('anon'));
console.log('\nSERVICE_ROLE_KEY (secret):');
console.log(sign('service_role'));
console.log('\n-------------------------------');