const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL, 
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

// Self-invoking async init (safe)
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error('❌ Redis connection failed:', err.message);
  }
})();

module.exports = redisClient;
