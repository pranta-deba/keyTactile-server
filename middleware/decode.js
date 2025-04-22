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
