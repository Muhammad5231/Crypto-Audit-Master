const router = require('express').Router();
router.use('/auth', require('./authRoutes'));
router.use('/workspaces', require('./workspaceRoutes'));
module.exports = router;
