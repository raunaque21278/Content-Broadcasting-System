const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.message === "Only JPG, PNG and GIF files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size must be less than 10MB"
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};

module.exports = errorMiddleware;