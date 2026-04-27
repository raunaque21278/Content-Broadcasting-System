const { createClient } = require("redis");
require("dotenv").config();

let redisClient = null;

const connectRedis = async () => {
  if (process.env.ENABLE_REDIS !== "true") {
    console.log("Redis disabled");
    return null;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  await redisClient.connect();
  console.log("Redis connected");

  return redisClient;
};

const getRedisClient = () => redisClient;

module.exports = {
  connectRedis,
  getRedisClient
};