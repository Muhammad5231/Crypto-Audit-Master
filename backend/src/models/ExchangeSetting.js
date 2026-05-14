const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true}, workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:'Workspace',index:true}, exchangeName:{type:String,default:'Default'}, buyFeePercent:{type:String,default:'0.1'}, sellFeePercent:{type:String,default:'0.1'} },{timestamps:true});
schema.index({workspaceId:1,exchangeName:1},{unique:true});
module.exports = mongoose.model('ExchangeSetting', schema);
