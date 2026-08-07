exports.checkHealth = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy and running smoothly!',
    timestamp: new Date().toISOString()
  });
};
