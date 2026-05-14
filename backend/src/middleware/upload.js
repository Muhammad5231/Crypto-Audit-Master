const multer = require('multer');
exports.uploadMemory = multer({ storage: multer.memoryStorage(), limits:{ fileSize: 10*1024*1024 }, fileFilter:(req,file,cb)=> file.originalname.toLowerCase().endsWith('.csv') ? cb(null,true) : cb(new Error('Only CSV files are allowed')) });
