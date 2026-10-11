const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const redis = require('./config/redis');
const transferRoutes = require('./routes/transferRoutes');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = ['ready', 'connect'].includes(redis.status) ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'OK',
    mongodb: mongoStatus,
    redis: redisStatus,
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api', transferRoutes);
app.use('/api', accountRoutes);

module.exports = app;
