const crypto = require('crypto');

function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex'); // 64 hex characters for 32 bytes
}

const token = generateToken();
console.log('Generated Token:', token);

