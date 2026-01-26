const redisClient = require('../utils/redisClient');

function getRateConfig(req) {
  // CREATE
  if (req.method === 'POST') {
    return {
      key: `rate:write:${req.ip}`,
      max: 10,
      window: 60,
    };
  }

  // READ HTML VIEW (/p/:id)
  if (req.method === 'GET' && req.params?.id && req.originalUrl.includes('/p/')) {
    return {
      key: `rate:read:${req.params.id}:${req.ip}`,
      max: 100,
      window: 60,
    };
  }

  // JSON API READ (/:id)
  if (req.method === 'GET' && req.params?.id) {
    return {
      key: `rate:read:${req.params.id}:${req.ip}`,
      max: 100,
      window: 60,
    };
  }

  return {
    key: `rate:other:${req.ip}`,
    max: 50,
    window: 60,
  };
}


module.exports = async function globalRateLimiter(req, res, next) {
  try {
    const { key, max, window } = getRateConfig(req);

    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, window);
    }

    if (count > max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: window,
      });
    }

    next();
  } catch (err) {
    // 🔥 Distributed systems rule
    console.warn('Redis unavailable, skipping global rate limit');
    next();
  }
};
