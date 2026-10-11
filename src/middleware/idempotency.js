/**
 * Middleware to enforce and extract X-Idempotency-Key header
 */
const idempotency = (req, res, next) => {
  const idempotencyKey = req.header('X-Idempotency-Key') || req.header('x-idempotency-key');

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: 'X-Idempotency-Key header required',
    });
  }

  req.idempotencyKey = idempotencyKey;
  next();
};

module.exports = idempotency;
