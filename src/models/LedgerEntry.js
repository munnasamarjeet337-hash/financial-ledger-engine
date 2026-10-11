const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  txn_id: {
    type: String,
    required: [true, 'Transaction ID is required'],
    index: true,
  },
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Account ID is required'],
  },
  type: {
    type: String,
    enum: {
      values: ['DEBIT', 'CREDIT'],
      message: '{VALUE} is not a valid ledger entry type',
    },
    required: [true, 'Type is required'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Secondary indexes
ledgerEntrySchema.index({ txn_id: 1, type: 1 }, { unique: true });
ledgerEntrySchema.index({ account_id: 1 });
ledgerEntrySchema.index({ created_at: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
