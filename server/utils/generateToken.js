const jwt = require('jsonwebtoken');

const generateToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'visstream_default_secret_change_me',
    { expiresIn: '7d' }
  );

module.exports = generateToken;
