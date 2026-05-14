const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:'Workspace'}, title:String, content:String },{timestamps:true});
module.exports = mongoose.model('Note', schema);
