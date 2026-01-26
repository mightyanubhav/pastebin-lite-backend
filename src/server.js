require("dotenv").config();
const express = require("express");
const cors = require("cors");

const redisClient = require("./utils/redisClient");
const { startHeartbeat, INSTANCE_ID } = require("./infra/registery");
const connectDB = require("./db");
const healthRoutes = require("./routes/health");
const pasteRoutes = require("./routes/pastes");

const localRateLimiter = require("./middlewares/localRateLimiter");
const globalRateLimiter = require("./middlewares/globalRateLimiter");

const app = express();


const corsOptions = {
  origin: [
    "https://pastebin-lite-frontend-beige.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));

// 🚨 REQUIRED for Vercel
app.options("*", cors(corsOptions));

app.use(express.json());
const PORT = process.env.PORT || 3000;
let server; 

app.use(localRateLimiter);
app.use(globalRateLimiter);

app.get("/debug", (req, res) => {
  res.send("Server is running");
});
app.get("/debug/redis", async (req, res) => {
  const redisClient = require("./utils/redisClient");
  const members = await redisClient.sMembers("active_backends");
  res.json({ members });
});

app.use("/api/healthz", healthRoutes);
app.use("/api/pastes", pasteRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});



const main = async () => {
  await connectDB();
  server = app.listen(PORT, () => {
    startHeartbeat();
    console.log("Server running on", PORT);
  });
};

// we’ll store the server instance

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1️⃣ Stop accepting new connections
    if (server) {
      server.close(() => {
        console.log("🚫 HTTP server closed");
      });
    }

    // 2️⃣ Remove from service discovery
    await redisClient.sRem("active_backends", INSTANCE_ID);
    await redisClient.del(`backend:${INSTANCE_ID}`);

    console.log(`🧹 Deregistered backend ${INSTANCE_ID}`);

    // 3️⃣ Small delay to allow LB to refresh
    setTimeout(() => {
      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    }, 3000);
  } catch (err) {
    console.error("❌ Error during shutdown:", err.message);
    process.exit(1);
  }
}

// Docker sends SIGTERM, Ctrl+C sends SIGINT
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

main();
