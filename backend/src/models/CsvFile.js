const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true}, workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:'Workspace',index:true}, filename:String, exchangeName:String, buyFeePercent:{type:String,default:'0.1'}, sellFeePercent:{type:String,default:'0.1'}, fileHash:String, fileSize:Number, parsedCount:{type:Number,default:0}, skippedCount:{type:Number,default:0}, filteredByStatus:{type:Number,default:0}, warnings:[String], isManual:{type:Boolean,default:false} },{timestamps:true});
schema.index({workspaceId:1,fileHash:1},{unique:false});
module.exports = mongoose.model('CsvFile', schema);
