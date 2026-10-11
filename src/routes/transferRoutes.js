const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { transfer } = require('../controllers/transferController');

router.post('/transfer', auth, idempotency, transfer);

module.exports = router;
