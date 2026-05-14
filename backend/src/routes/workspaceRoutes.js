const router = require('express').Router();
const Workspace = require('../models/Workspace'); const CsvFile=require('../models/CsvFile'); const Trade=require('../models/Trade'); const ExchangeSetting=require('../models/ExchangeSetting'); const Report=require('../models/Report'); const Note=require('../models/Note'); const ExportHistory=require('../models/ExportHistory');
const { auth } = require('../middleware/auth'); const { workspaceAccess } = require('../middleware/workspaceAccess'); const { uploadMemory } = require('../middleware/upload'); const { asyncHandler } = require('../middleware/errorHandler'); const { sha256Buffer } = require('../utils/hash'); const { parseCsv } = require('../services/csvParser'); const { runFifo } = require('../services/fifoEngine'); const PDFDocument = require('pdfkit');
router.use(auth);
const mapId = (o)=>({ ...o.toObject?.()||o, id:String(o._id||o.id) });
router.get('/', asyncHandler(async(req,res)=>{ const q={userId:req.user._id}; if(req.query.includeArchived!=='true') q.isArchived=false; const workspaces=(await Workspace.find(q).sort({lastOpenedAt:-1})).map(mapId); res.json({workspaces}); }));
router.post('/', asyncHandler(async(req,res)=>{ const workspace=await Workspace.create({userId:req.user._id,...req.body}); await ExchangeSetting.create({userId:req.user._id,workspaceId:workspace._id,exchangeName:'Default'}); res.json({workspace:mapId(workspace)}); }));
router.get('/:id', workspaceAccess, (req,res)=>res.json({workspace:mapId(req.workspace)}));
router.patch('/:id', workspaceAccess, asyncHandler(async(req,res)=>{ Object.assign(req.workspace, req.body); await req.workspace.save(); res.json({workspace:mapId(req.workspace)}); }));
router.delete('/:id', workspaceAccess, asyncHandler(async(req,res)=>{ await Promise.all([Workspace.deleteOne({_id:req.workspace._id}), CsvFile.deleteMany({workspaceId:req.workspace._id}), Trade.deleteMany({workspaceId:req.workspace._id}), Report.deleteMany({workspaceId:req.workspace._id}), ExchangeSetting.deleteMany({workspaceId:req.workspace._id}), Note.deleteMany({workspaceId:req.workspace._id})]); res.json({success:true}); }));
router.post('/:id/archive', workspaceAccess, asyncHandler(async(req,res)=>{ req.workspace.isArchived=!!req.body.isArchived; await req.workspace.save(); res.json({workspace:mapId(req.workspace)}); }));
router.post('/:id/duplicate', workspaceAccess, asyncHandler(async(req,res)=>{ const w=await Workspace.create({...req.workspace.toObject(), _id:undefined, name:req.workspace.name+' Copy', createdAt:undefined, updatedAt:undefined}); res.json({workspace:mapId(w)}); }));
router.patch('/:id/last-opened', workspaceAccess, asyncHandler(async(req,res)=>{ req.workspace.lastOpenedAt=new Date(); await req.workspace.save(); res.json({success:true}); }));
router.get('/:workspaceId/uploads', workspaceAccess, asyncHandler(async(req,res)=>{ const uploads=(await CsvFile.find({workspaceId:req.workspace._id}).sort({createdAt:-1})).map(mapId); res.json({uploads,total:uploads.length}); }));
function cleanPercent(value, fallback){ const n=Number(value); return Number.isFinite(n) && n >= 0 ? String(n) : String(fallback); }
async function handleUpload(req,res){
  const exchangeName=String(req.body.exchangeName||'Default').trim()||'Default';
  const buyFeePercent=cleanPercent(req.body.buyFeePercent,'0.1');
  const sellFeePercent=cleanPercent(req.body.sellFeePercent,'0.1');
  if(!req.file) return res.status(400).json({error:'CSV file required'});
  const hash=sha256Buffer(req.file.buffer);
  const duplicate=await CsvFile.findOne({workspaceId:req.workspace._id,fileHash:hash});
  if(duplicate) return res.status(409).json({error:'Duplicate CSV already uploaded', fileId:duplicate._id});

  // Save/update fee fallback setting before processing. FIFO will use CSV fees first;
  // these percentages are only used when CSV fee is missing/zero.
  await ExchangeSetting.findOneAndUpdate(
    {workspaceId:req.workspace._id,exchangeName},
    {userId:req.user._id,workspaceId:req.workspace._id,exchangeName,buyFeePercent,sellFeePercent},
    {new:true,upsert:true,setDefaultsOnInsert:true}
  );

  const parsed=parseCsv(req.file.buffer, exchangeName);
  const file=await CsvFile.create({userId:req.user._id,workspaceId:req.workspace._id,filename:req.file.originalname,exchangeName,buyFeePercent,sellFeePercent,fileHash:hash,fileSize:req.file.size,parsedCount:parsed.trades.length,skippedCount:parsed.skippedCount,filteredByStatus:parsed.filteredByStatus,warnings:[...parsed.warnings,...parsed.metaWarnings]});
  if(parsed.trades.length>0) await Trade.insertMany(parsed.trades.map(t=>({...t,userId:req.user._id,workspaceId:req.workspace._id,csvFileId:file._id})));
  await Report.deleteMany({workspaceId:req.workspace._id});
  res.json({success:true,fileId:String(file._id),parsedCount:parsed.trades.length,skippedCount:parsed.skippedCount,filteredByStatus:parsed.filteredByStatus,detectedExchange:exchangeName,exchangeName,buyFeePercent,sellFeePercent,warnings:file.warnings});
}
router.post('/:workspaceId/uploads', workspaceAccess, uploadMemory.single('file'), asyncHandler(handleUpload));
router.post('/:workspaceId/upload-with-mapping', workspaceAccess, uploadMemory.single('file'), asyncHandler(handleUpload));
router.delete('/:workspaceId/uploads/:fileId', workspaceAccess, asyncHandler(async(req,res)=>{ await Trade.deleteMany({workspaceId:req.workspace._id,csvFileId:req.params.fileId}); await CsvFile.deleteOne({_id:req.params.fileId,workspaceId:req.workspace._id}); await Report.deleteMany({workspaceId:req.workspace._id}); res.json({success:true}); }));
router.post(
  "/:workspaceId/process",
  workspaceAccess,
  asyncHandler(async (req, res) => {
    const trades = await Trade.find({
      workspaceId: req.workspace._id,
      userId: req.user._id,
    }).sort({ executedAt: 1 });

    if (!trades.length) {
      return res.status(400).json({
        error:
          "No trades found in database. Please delete old upload and upload CSV again.",
        realizedCount: 0,
        holdingsCount: 0,
        rawTradeCount: 0,
      });
    }

    const settings = await ExchangeSetting.find({
      workspaceId: req.workspace._id,
      userId: req.user._id,
    });

    const settingsMap = {};

    settings.forEach((setting) => {
      settingsMap[setting.exchangeName] = {
        buyFeePercent: setting.buyFeePercent,
        sellFeePercent: setting.sellFeePercent,
      };
    });

    const result = runFifo(trades, settingsMap);

    await Report.deleteMany({
      workspaceId: req.workspace._id,
      userId: req.user._id,
    });

    const report = await Report.create({
      userId: req.user._id,
      workspaceId: req.workspace._id,
      realizedTrades: result.realizedTrades,
      openHoldings: result.openHoldings,
      summary: result.summary,
      warnings: result.warnings,
    });

    res.json({
      success: true,
      reportId: String(report._id),
      rawTradeCount: trades.length,
      realizedCount: result.realizedTrades.length,
      holdingsCount: result.openHoldings.length,
      warnings: result.warnings,
      summary: result.summary,
    });
  })
);
async function latestReport(workspaceId,userId){ let r=await Report.findOne({workspaceId}).sort({generatedAt:-1}); if(!r){ const trades=await Trade.find({workspaceId}).sort({executedAt:1}); const settings=await ExchangeSetting.find({workspaceId}); const settingsMap={}; settings.forEach(s=>settingsMap[s.exchangeName]={buyFeePercent:s.buyFeePercent,sellFeePercent:s.sellFeePercent}); r=await Report.create({userId,workspaceId,...runFifo(trades,settingsMap)}); } return r; }
router.get('/:workspaceId/report', workspaceAccess, asyncHandler(async(req,res)=>res.json(await latestReport(req.workspace._id,req.user._id))));
router.get('/:workspaceId/realized-trades', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); let trades=r.realizedTrades||[]; if(req.query.search) trades=trades.filter(t=>String(t.pair).includes(String(req.query.search).toUpperCase())); res.json({trades,total:trades.length}); }));
router.get('/:workspaceId/open-holdings', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); res.json({holdings:r.openHoldings||[]}); }));
router.get('/:workspaceId/analytics', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); res.json({summary:r.summary||{}, realizedTrades:r.realizedTrades||[], openHoldings:r.openHoldings||[], warnings:r.warnings||[]}); }));
router.get('/:workspaceId/daily-profit', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); const m={}; (r.realizedTrades||[]).forEach(t=>{ const d=new Date(t.sellDate).toISOString().slice(0,10); m[d]=m[d]||{date:d,profit:0,trades:0}; m[d].profit+=Number(t.finalNetProfit||0); m[d].trades++; }); res.json({dailyProfit:Object.values(m).sort((a,b)=>a.date.localeCompare(b.date))}); }));
router.get('/:workspaceId/exchange-settings', workspaceAccess, asyncHandler(async(req,res)=>res.json({settings:(await ExchangeSetting.find({workspaceId:req.workspace._id})).map(mapId)})));
router.post('/:workspaceId/exchange-settings', workspaceAccess, asyncHandler(async(req,res)=>{ const exchangeName=String(req.body.exchangeName||'Default').trim()||'Default'; const s=await ExchangeSetting.findOneAndUpdate({workspaceId:req.workspace._id,exchangeName},{userId:req.user._id,workspaceId:req.workspace._id,exchangeName,buyFeePercent:cleanPercent(req.body.buyFeePercent,'0.1'),sellFeePercent:cleanPercent(req.body.sellFeePercent,'0.1')},{new:true,upsert:true,setDefaultsOnInsert:true}); await Report.deleteMany({workspaceId:req.workspace._id}); res.json({setting:mapId(s)}); }));
router.patch('/:workspaceId/exchange-settings/:settingId', workspaceAccess, asyncHandler(async(req,res)=>res.json({setting:mapId(await ExchangeSetting.findOneAndUpdate({_id:req.params.settingId,workspaceId:req.workspace._id},req.body,{new:true}))})));
router.delete('/:workspaceId/exchange-settings/:settingId', workspaceAccess, asyncHandler(async(req,res)=>{ await ExchangeSetting.deleteOne({_id:req.params.settingId,workspaceId:req.workspace._id}); res.json({success:true}); }));
router.get('/:workspaceId/notes', workspaceAccess, asyncHandler(async(req,res)=>res.json({notes:(await Note.find({workspaceId:req.workspace._id}).sort({updatedAt:-1})).map(mapId)})));
router.post('/:workspaceId/notes', workspaceAccess, asyncHandler(async(req,res)=>res.json({note:mapId(await Note.create({userId:req.user._id,workspaceId:req.workspace._id,...req.body}))})));
router.patch('/:workspaceId/notes/:noteId', workspaceAccess, asyncHandler(async(req,res)=>res.json({note:mapId(await Note.findOneAndUpdate({_id:req.params.noteId,workspaceId:req.workspace._id},req.body,{new:true}))})));
router.delete('/:workspaceId/notes/:noteId', workspaceAccess, asyncHandler(async(req,res)=>{ await Note.deleteOne({_id:req.params.noteId,workspaceId:req.workspace._id}); res.json({success:true}); }));
router.post('/:workspaceId/manual-trades', workspaceAccess, asyncHandler(async(req,res)=>{ let csv=await CsvFile.findOne({workspaceId:req.workspace._id,isManual:true}); if(!csv) csv=await CsvFile.create({userId:req.user._id,workspaceId:req.workspace._id,filename:'Manual Trades',exchangeName:'Manual',isManual:true}); const t=await Trade.create({userId:req.user._id,workspaceId:req.workspace._id,csvFileId:csv._id,exchangeName:'Manual',pair:String(req.body.pair).toUpperCase(),side:String(req.body.side).toUpperCase(),quantity:String(req.body.quantity),price:String(req.body.price),fee:String(req.body.fee||0),executedAt:new Date(req.body.date),isManual:true}); res.json({success:true,trade:{id:t._id,pair:t.pair,side:t.side,quantity:t.quantity,price:t.price,fees:t.fee,executedAt:t.executedAt},csvFileId:String(csv._id)}); }));
router.get('/:workspaceId/manual-trades', workspaceAccess, asyncHandler(async(req,res)=>{ const trades=await Trade.find({workspaceId:req.workspace._id,isManual:true}); const files=await CsvFile.find({workspaceId:req.workspace._id,isManual:true}); res.json({success:true,manualCsvFiles:files.map(mapId),trades:trades.map(mapId),totalTrades:trades.length}); }));
function csvEscape(v){ return '"'+String(v??'').replace(/"/g,'""')+'"'; }
router.get('/:workspaceId/export', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); const cols=['pair','matchedQty','buyPrice','sellPrice','grossProfit','totalFees','gstOnFees','tds','baseCryptoTax','cess','totalDirectTax','netProfitInHand','finalNetProfit','feeSource']; const csv=[cols.join(','),...(r.realizedTrades||[]).map(t=>cols.map(c=>csvEscape(t[c])).join(','))].join('\n'); await ExportHistory.create({userId:req.user._id,workspaceId:req.workspace._id,type:'csv',filename:'crypto-audit-report.csv',rows:(r.realizedTrades||[]).length}); res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="crypto-audit-report.csv"'); res.send(csv); }));
router.get('/:workspaceId/export-pdf', workspaceAccess, asyncHandler(async(req,res)=>{ const r=await latestReport(req.workspace._id,req.user._id); const doc=new PDFDocument({margin:40}); res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','attachment; filename="crypto-audit-report.pdf"'); doc.pipe(res); doc.fontSize(20).text('Crypto Audit Master - Tax Report'); doc.moveDown().fontSize(11).text(`Workspace: ${req.workspace.name}`).text(`Generated: ${new Date().toLocaleString()}`); doc.moveDown().fontSize(14).text('Summary'); Object.entries(r.summary||{}).forEach(([k,v])=>doc.fontSize(10).text(`${k}: ${v}`)); doc.moveDown().fontSize(14).text('Realized Trades'); (r.realizedTrades||[]).slice(0,60).forEach(t=>doc.fontSize(9).text(`${t.pair} | Qty ${t.matchedQty} | Gross ${t.grossProfit} | Final ${t.finalNetProfit} | Fee ${t.feeSource}`)); doc.end(); await ExportHistory.create({userId:req.user._id,workspaceId:req.workspace._id,type:'pdf',filename:'crypto-audit-report.pdf',rows:(r.realizedTrades||[]).length}); }));
router.get('/:workspaceId/export-history', workspaceAccess, asyncHandler(async(req,res)=>res.json({history:(await ExportHistory.find({workspaceId:req.workspace._id}).sort({createdAt:-1})).map(mapId)})));
module.exports = router;
