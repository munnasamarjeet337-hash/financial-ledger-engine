const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBalance, getHistory } = require('../controllers/accountController');

router.get('/balance/:accountId', auth, getBalance);
router.get('/transactions/:accountId', auth, getHistory);

module.exports = router;
