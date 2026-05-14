const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true}, workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:'Workspace',index:true}, realizedTrades:[Object], openHoldings:[Object], summary:Object, warnings:[String], generatedAt:{type:Date,default:Date.now} },{timestamps:true});
module.exports = mongoose.model('Report', schema);
