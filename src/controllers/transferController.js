const { transferMoney } = require('../services/ledgerService');

/**
 * Handles money transfer between accounts.
 */
const transfer = async (req, res) => {
  try {
    const fromAccountId = req.body.fromAccountId || req.body.from;
    const toAccountId = req.body.toAccountId || req.body.to;
    const amount = req.body.amount;
    const idempotencyKey = req.idempotencyKey || req.header('X-Idempotency-Key') || req.header('x-idempotency-key');

    if (!fromAccountId || !toAccountId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'fromAccountId (or from), toAccountId (or to), and amount are required',
      });
    }

    const result = await transferMoney(fromAccountId, toAccountId, amount, idempotencyKey);

    return res.status(200).json({
      success: true,
      txn_id: result.txn_id,
      from: result.from,
      to: result.to,
      amount: result.amount,
    });
  } catch (error) {
    console.error(`[TransferController] Transfer failed: ${error.message}`);

    if (error.message === 'Insufficient balance') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes('not found') ||
      error.message.includes('Cannot transfer to the same account') ||
      error.message.includes('must be a positive number')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('concurrent modification')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during transfer processing',
    });
  }
};

module.exports = {
  transfer,
};
