const WINDOW_SIZE = 10 * 1000;

const LIMITS = {
  WRITE: 5,     // POST /paste
  READ: 50,     // GET /p/:id
  OTHER: 20,
};

const store = new Map();

function getLimit(req) {
  if (req.method === 'POST') return LIMITS.WRITE;
  if (req.method === 'GET' && req.originalUrl.includes('/p/')) {
    return LIMITS.READ;
  }
  return LIMITS.OTHER;
}

module.exports = function localRateLimiter(req, res, next) {
  const key = `${req.ip}:${req.method}:${req.originalUrl}`;
  const now = Date.now();
  const limit = getLimit(req);

  const record = store.get(key) || { count: 0, start: now };

  if (now - record.start > WINDOW_SIZE) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }

  store.set(key, record);

  if (record.count > limit) {
    return res.status(429).json({
      error: 'Too many requests (local)',
    });
  }

  next();
};
 