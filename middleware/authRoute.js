const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware'); // your JWT auth middleware
const roleGuard = require('./roleGuard'); // the middleware above

const app = express();

app.get('/admin-dashboard', authMiddleware, roleGuard('admin'), (req, res) => {
  res.send('Welcome, Admin!');
});
