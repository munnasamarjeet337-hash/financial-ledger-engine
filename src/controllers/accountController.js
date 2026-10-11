const { getBalance, getTransactionHistory } = require('../services/accountService');

/**
 * Controller to fetch the balance of an account.
 */
const getBalanceController = async (req, res) => {
  try {
    const { accountId } = req.params;
    const balance = await getBalance(accountId);

    return res.status(200).json({
      success: true,
      balance,
      accountId,
    });
  } catch (error) {
    console.error(`[AccountController] getBalance error: ${error.message}`);
    const statusCode =
      error.statusCode ||
      (error.message.includes('not found') ? 404 : error.message.includes('Invalid') ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Controller to fetch paginated transaction history for an account.
 */
const getHistoryController = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit, page } = req.query;

    const result = await getTransactionHistory(accountId, limit, page);

    return res.status(200).json({
      success: true,
      transactions: result.transactions,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error(`[AccountController] getHistory error: ${error.message}`);
    const statusCode =
      error.statusCode ||
      (error.message.includes('not found') ? 404 : error.message.includes('Invalid') ? 400 : 500);

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getBalance: getBalanceController,
  getHistory: getHistoryController,
};
