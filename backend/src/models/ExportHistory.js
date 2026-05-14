const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:'Workspace'}, type:String, filename:String, rows:Number },{timestamps:true});
module.exports = mongoose.model('ExportHistory', schema);
