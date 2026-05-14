const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
exports.auth = async (req,res,next)=>{
  try { const raw = req.headers.authorization || ''; const token = raw.startsWith('Bearer ') ? raw.slice(7) : null; if(!token) return res.status(401).json({error:'Unauthorized'}); const data = verifyToken(token); const user = await User.findById(data.id).select('-passwordHash'); if(!user) return res.status(401).json({error:'Unauthorized'}); req.user = user; next(); }
  catch(e){ return res.status(401).json({error:'Invalid token'}); }
};
