const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, name:{type:String,required:true}, description:String, color:{type:String,default:'#14b8a6'}, icon:{type:String,default:'Wallet'}, financialYear:{type:String,default:'2025-26'}, isArchived:{type:Boolean,default:false}, lastOpenedAt:{type:Date,default:Date.now} },{timestamps:true});
module.exports = mongoose.model('Workspace', schema);
