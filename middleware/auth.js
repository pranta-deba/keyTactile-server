const jwt = require("jsonwebtoken");

// Replace with your secret key from .env or config
const SECRET_KEY = "your_secret_key";

const authMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden: Invalid token" });
  }
};

module.exports = authMiddleware;
