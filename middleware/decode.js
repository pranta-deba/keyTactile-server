const jwt = require('jsonwebtoken');

function decodeJWT(token) {
  try {
    // Decode the token without verifying signature
    const decoded = jwt.decode(token, { complete: true }); // use `{ complete: true }` if you want header too
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error.message);
    return null;
  }
}

const token = 'your_jwt_token_here';
const decodedToken = decodeJWT(token);

if (decodedToken) {
  console.log('Decoded Payload:', decodedToken.payload);
} else {
  console.log('Invalid token');
}

const decoded = jwt.verify(token, 'your_secret_key');

