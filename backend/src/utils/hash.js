const crypto = require('crypto');
exports.sha256Buffer = (buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
