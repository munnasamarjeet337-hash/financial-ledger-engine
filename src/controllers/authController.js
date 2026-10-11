const { registerUser, loginUser } = require('../services/authService');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await registerUser({ name, email, password });

    return res.status(201).json({
      success: true,
      message: 'User and account registered successfully',
      data: result,
    });
  } catch (error) {
    console.error(`[AuthController] Registration error: ${error.message}`);
    const statusCode =
      error.message.includes('already exists') || error.message.includes('required')
        ? 400
        : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error(`[AuthController] Login error: ${error.message}`);
    const statusCode =
      error.message.includes('Invalid') || error.message.includes('required')
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
};
