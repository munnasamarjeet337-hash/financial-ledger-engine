const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const mongoose = connectDB.mongoose || require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');

/**
 * Registers a new user and automatically creates an associated Account
 * with balance: 0 and version: 0 within a MongoDB transaction.
 *
 * @param {Object|string} userDataOrName - User payload { name, email, password } or name string
 * @param {string} [emailParam] - Email if positional arguments used
 * @param {string} [passwordParam] - Password if positional arguments used
 * @returns {Promise<Object>} Created user and account
 */
const registerUser = async (userDataOrName, emailParam, passwordParam) => {
  let name, email, password;
  if (typeof userDataOrName === 'object' && userDataOrName !== null) {
    ({ name, email, password } = userDataOrName);
  } else {
    name = userDataOrName;
    email = emailParam;
    password = passwordParam;
  }

  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validate existing user before starting transaction
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Start MongoDB session and transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`[AuthService] Registering user with email: ${normalizedEmail}`);
    const [user] = await User.create(
      [
        {
          name: name.trim(),
          email: normalizedEmail,
          password_hash,
        },
      ],
      { session }
    );

    console.log(`[AuthService] Creating initial Account for user: ${user._id}`);
    const [account] = await Account.create(
      [
        {
          user_id: user._id,
          balance: 0,
          version: 0,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    console.log(`[AuthService] Successfully registered user (${user._id}) and account (${account._id})`);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      account: {
        _id: account._id,
        user_id: account.user_id,
        balance: account.balance,
        version: account.version,
        updated_at: account.updated_at,
      },
    };
  } catch (error) {
    console.error(`[AuthService] Error in registerUser transaction. Aborting: ${error.message}`);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    console.log(`[AuthService] Ending MongoDB session`);
    await session.endSession();
  }
};

/**
 * Authenticates user credentials and returns JWT token and account info.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const account = await Account.findOne({ user_id: user._id });

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      account_id: account ? account._id : null,
    },
    process.env.JWT_SECRET || 'your_super_secret_key_change_this',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
    account: account
      ? {
          _id: account._id,
          balance: account.balance,
          version: account.version,
        }
      : null,
  };
};

module.exports = {
  registerUser,
  loginUser,
};
