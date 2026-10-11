const crypto = require('crypto');
const connectDB = require('../config/db');
const mongoose = connectDB.mongoose || require('mongoose');
const redis = require('../config/redis');
const Account = require('../models/Account');
const LedgerEntry = require('../models/LedgerEntry');

/**
 * Checks if an error is a retryable MongoDB transaction write conflict.
 *
 * @param {Error} err
 * @returns {boolean}
 */
const isRetryableConflict = (err) => {
  if (!err) return false;

  const msg = err.message || '';
  if (
    msg.includes('WriteConflict') ||
    msg.includes('Write conflict') ||
    msg.includes('TransientTransactionError')
  ) {
    return true;
  }

  if (typeof err.hasErrorLabel === 'function' && err.hasErrorLabel('TransientTransactionError')) {
    return true;
  }

  if (Array.isArray(err.errorLabels) && err.errorLabels.includes('TransientTransactionError')) {
    return true;
  }

  if (err.code === 112) {
    return true;
  }

  return false;
};

/**
 * Executes a double-entry money transfer with atomic decrement/increment,
 * transaction retry logic (up to 10 retries with exponential backoff),
 * extended transaction timeouts, and Redis idempotency.
 *
 * @param {string} fromAccountId - Source account ID
 * @param {string} toAccountId - Destination account ID
 * @param {number} amount - Amount to transfer
 * @param {string} idempotencyKey - Unique idempotency key
 * @returns {Promise<Object>} Transfer result payload
 */
const transferMoney = async (fromAccountId, toAccountId, amount, idempotencyKey) => {
  console.log(`[LedgerService] Initiating transfer: from=${fromAccountId}, to=${toAccountId}, amount=${amount}, idempotencyKey=${idempotencyKey}`);

  if (!fromAccountId || !toAccountId) {
    throw new Error('Both fromAccountId and toAccountId are required');
  }

  if (fromAccountId.toString() === toAccountId.toString()) {
    throw new Error('Cannot transfer to the same account');
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Transfer amount must be a positive number');
  }

  // Step 1: Check Redis for idempotencyKey. If exists, return cached response.
  if (idempotencyKey) {
    try {
      const cached = await redis.get(idempotencyKey);
      if (cached) {
        console.log(`[LedgerService] Idempotency cache hit for key: ${idempotencyKey}`);
        return JSON.parse(cached);
      }
    } catch (cacheErr) {
      console.warn(`[LedgerService] Redis cache lookup error: ${cacheErr.message}`);
    }
  }

  const MAX_RETRIES = 10;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Create a fresh session for each retry attempt
    const session = await mongoose.startSession();

    try {
      session.startTransaction({
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 30000,
      });

      // Atomic decrement with balance check
      console.log(`[LedgerService] Executing atomic decrement on sender ${fromAccountId} (Attempt ${attempt + 1}/${MAX_RETRIES})`);
      const fromAccount = await Account.findOneAndUpdate(
        { _id: fromAccountId, balance: { $gte: numericAmount } },
        {
          $inc: { balance: -numericAmount },
          $set: { updated_at: new Date() },
        },
        { session, new: true }
      );

      if (!fromAccount) {
        const senderExists = await Account.exists({ _id: fromAccountId }).session(session);
        if (!senderExists) {
          throw new Error(`Sender account ${fromAccountId} not found`);
        }
        throw new Error('Insufficient balance');
      }

      // Atomic increment on recipient
      console.log(`[LedgerService] Executing atomic increment on recipient ${toAccountId} (Attempt ${attempt + 1}/${MAX_RETRIES})`);
      const toAccount = await Account.findOneAndUpdate(
        { _id: toAccountId },
        {
          $inc: { balance: numericAmount },
          $set: { updated_at: new Date() },
        },
        { session, new: true }
      );

      if (!toAccount) {
        throw new Error(`Recipient account ${toAccountId} not found`);
      }

      // Create double-entry ledger records
      const txn_id = crypto.randomUUID();
      console.log(`[LedgerService] Creating double-entry ledger records with txn_id: ${txn_id}`);

      const debitEntry = new LedgerEntry({
        txn_id,
        account_id: fromAccountId,
        type: 'DEBIT',
        amount: numericAmount,
      });

      const creditEntry = new LedgerEntry({
        txn_id,
        account_id: toAccountId,
        type: 'CREDIT',
        amount: numericAmount,
      });

      await debitEntry.save({ session });
      await creditEntry.save({ session });

      // Validate SUM(DEBIT) === SUM(CREDIT) before commit
      const debitSum = debitEntry.amount;
      const creditSum = creditEntry.amount;
      if (debitSum !== creditSum) {
        throw new Error('Ledger integrity violation: SUM(DEBIT) does not match SUM(CREDIT)');
      }

      // Commit transaction
      await session.commitTransaction();
      console.log(`[LedgerService] Transaction committed successfully for txn_id: ${txn_id} on attempt ${attempt + 1}`);

      const responsePayload = {
        success: true,
        txn_id,
        from: fromAccountId,
        to: toAccountId,
        amount: numericAmount,
      };

      // Store response in Redis with key idempotencyKey, TTL 86400 seconds
      if (idempotencyKey) {
        try {
          await redis.set(idempotencyKey, JSON.stringify(responsePayload), 'EX', 86400);
          console.log(`[LedgerService] Response cached in Redis for key: ${idempotencyKey} (TTL 86400s)`);
        } catch (cacheErr) {
          console.error(`[LedgerService] Failed to cache response in Redis: ${cacheErr.message}`);
        }
      }

      return responsePayload;
    } catch (err) {
      console.error(`[LedgerService] Transaction error on attempt ${attempt + 1}/${MAX_RETRIES}: ${err.message}`);

      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const isRetryable = isRetryableConflict(err);

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = Math.min(50 * Math.pow(2, attempt), 2000);
        console.log(`[LedgerService] Write conflict detected. Retrying attempt ${attempt + 2}/${MAX_RETRIES} after ${delay}ms backoff...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    } finally {
      console.log(`[LedgerService] Ending session for attempt ${attempt + 1}`);
      await session.endSession();
    }
  }

  throw new Error('Transaction failed after max retries');
};

module.exports = {
  transferMoney,
};
