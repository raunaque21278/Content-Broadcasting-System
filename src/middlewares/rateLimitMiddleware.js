const rateLimit = require("express-rate-limit");

const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

module.exports = publicApiLimiter;