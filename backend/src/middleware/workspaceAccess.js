const Workspace = require('../models/Workspace');
exports.workspaceAccess = async (req,res,next)=>{
  const id = req.params.workspaceId || req.params.id;
  const workspace = await Workspace.findOne({ _id:id, userId:req.user._id });
  if(!workspace) return res.status(404).json({ error:'Workspace not found or access denied' });
  req.workspace = workspace; next();
};
