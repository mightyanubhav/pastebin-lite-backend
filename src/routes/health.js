const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const state = mongoose.connection.readyState;
  res.status(200).json({ ok: state === 1 });
});

module.exports = router;
