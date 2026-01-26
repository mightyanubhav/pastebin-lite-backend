// 🚫 Docker-managed backends MUST NOT touch Redis
if (process.env.DISABLE_REGISTRY === "true") {
  console.log("🔕 Registry disabled (managed by autoscaler)");
  module.exports = {
    INSTANCE_ID: null,
    startHeartbeat: () => {}
  };
  return;
}

// ---- Manual run only ----
const os = require("os");
const redisClient = require("../utils/redisClient");

const PORT = process.env.PORT || 3000;
const INSTANCE_ID = `${os.hostname()}:${PORT}`;

const HEARTBEAT_TTL = 15;
const HEARTBEAT_INTERVAL = 5;

async function register() {
  await redisClient.sAdd("active_backends", INSTANCE_ID);
  await redisClient.set(`backend:${INSTANCE_ID}`, "alive", { EX: HEARTBEAT_TTL });
}

async function startHeartbeat() {
  await register();
  setInterval(register, HEARTBEAT_INTERVAL * 1000);
}

module.exports = { INSTANCE_ID, startHeartbeat };
