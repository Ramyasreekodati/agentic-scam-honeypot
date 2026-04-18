module.exports = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const secretKey = process.env.YOUR_SECRET_API_KEY;

  if (!apiKey || apiKey !== secretKey) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid or missing x-api-key'
    });
  }
  next();
};
