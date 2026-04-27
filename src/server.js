require("dotenv").config();
const app = require("./app");
const db = require("./config/db");
const initDb = require("./config/initDb");
const { connectRedis } = require("./config/redis");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully");

    await initDb();

    await connectRedis();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();