const jwt = require('jsonwebtoken');
exports.signToken = (user)=>jwt.sign({ id:user._id, email:user.email, username:user.username }, process.env.JWT_SECRET || 'dev_secret', { expiresIn:'7d' });
exports.verifyToken = (token)=>jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
