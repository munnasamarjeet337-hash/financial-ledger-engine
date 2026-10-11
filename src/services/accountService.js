const mongoose = require('mongoose');
const Account = require('../models/Account');
const LedgerEntry = require('../models/LedgerEntry');

/**
 * Validates and retrieves an account by its ID.
 *
 * @param {string} accountId - MongoDB account ObjectId
 * @returns {Promise<Object>} Account document
 */
const validateAndGetAccount = async (accountId) => {
  if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
    const error = new Error('Invalid account ID');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findById(accountId);
  if (!account) {
    const error = new Error('Account not found');
    error.statusCode = 404;
    throw error;
  }

  return account;
};

/**
 * Retrieves the current balance for an account.
 *
 * @param {string} accountId - Account ObjectId
 * @returns {Promise<number>} Current balance
 */
const getBalance = async (accountId) => {
  const account = await validateAndGetAccount(accountId);
  return account.balance;
};

/**
 * Retrieves paginated transaction history (ledger entries) for an account,
 * sorted by created_at in descending order.
 *
 * @param {string} accountId - Account ObjectId
 * @param {number|string} [limit=10] - Number of records per page (max 100)
 * @param {number|string} [page=1] - Page number (1-based)
 * @returns {Promise<{transactions: Array, total: number, page: number, limit: number}>}
 */
const getTransactionHistory = async (accountId, limit = 10, page = 1) => {
  await validateAndGetAccount(accountId);

  let parsedPage = parseInt(page, 10);
  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = 1;
  }

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = 10;
  } else if (parsedLimit > 100) {
    parsedLimit = 100;
  }

  const skip = (parsedPage - 1) * parsedLimit;

  const [total, transactions] = await Promise.all([
    LedgerEntry.countDocuments({ account_id: accountId }),
    LedgerEntry.find({ account_id: accountId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
  ]);

  return {
    transactions,
    total,
    page: parsedPage,
    limit: parsedLimit,
  };
};

module.exports = {
  getBalance,
  getTransactionHistory,
};
