# Financial Ledger Engine

A backend system that handles money transfers between accounts — like a mini version of PhonePe or Razorpay. Built with Node.js, Express, MongoDB, and Redis. It ensures every transaction is atomic (all or nothing), prevents duplicate transfers using idempotency keys, and keeps a permanent double-entry record (DEBIT = CREDIT) for every transfer. Handles concurrent requests safely using MongoDB transactions and Redis caching, with zero data loss.

## Features

- JWT Authentication
- Double-Entry Bookkeeping (DEBIT = CREDIT)
- MongoDB Transactions with Optimistic Locking
- Redis Idempotency (prevents duplicate transfers)
- Balance and Transaction History APIs
- Retry Logic for Write Conflicts

## Tech Stack

- Node.js + Express.js
- MongoDB Atlas (Mongoose)
- Redis Cloud (ioredis)
- JWT + bcrypt
- Joi Validation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT |
| POST | /api/transfer | Transfer money (idempotent) |
| GET | /api/balance/:accountId | Get account balance |
| GET | /api/transactions/:accountId | Get transaction history |
| GET | /health | Health check |

## Setup

npm install
npm run dev


## Load Testing

- Requests: 1000
- Success Rate: 97.5%
- Data Loss: 0%

