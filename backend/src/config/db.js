const mongoose = require('mongoose');
module.exports = async function connectDB(){
  try { await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto_audit_master'); console.log('MongoDB connected'); }
  catch(err){ console.error('MongoDB error:', err.message); process.exit(1); }
};
