function getNowMs(req) {
  if (process.env.TEST_MODE === "1") {
    const h = req.headers["x-test-now-ms"];
    if (h) return Number(h);
  }
  return Date.now();
}

module.exports = { getNowMs };
