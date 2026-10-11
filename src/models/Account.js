const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  balance: {
    type: Number,
    default: 0,
  },
  version: {
    type: Number,
    default: 0,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Index for user_id
accountSchema.index({ user_id: 1 });

module.exports = mongoose.model('Account', accountSchema);
