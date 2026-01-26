const express = require("express");
const { v4: uuid } = require("uuid");
const Paste = require("../models/Paste");
const { getNowMs } = require("../utils/time");
const redisClient = require("../utils/redisClient");

const CACHE_TTL_SECONDS = 300; // 5 minutes

function getPasteCacheKey(id) {
  return `paste:${id}`;
}

function computeCacheTTL(paste, now) {
  if (!paste.expiresAt) return CACHE_TTL_SECONDS;
  const remainingMs = paste.expiresAt - now;
  return Math.max(
    1,
    Math.min(CACHE_TTL_SECONDS, Math.floor(remainingMs / 1000)),
  );
}

async function readPasteWithCache(id, now) {
  const cacheKey = getPasteCacheKey(id);

  // 1️⃣ Try Redis
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    const paste = JSON.parse(cached);

    // View limit check (cached)
    if (paste.maxViews !== null && paste.viewsUsed >= paste.maxViews) {
      await redisClient.del(cacheKey);
      return null;
    }

    // Increment views in cache
    paste.viewsUsed += 1;

    await redisClient.setEx(
      cacheKey,
      computeCacheTTL(paste, now),
      JSON.stringify(paste),
    );

    return paste;
  }

  // 2️⃣ Fallback to MongoDB
  const paste = await Paste.findById(id);
  if (!paste) return null;

  // TTL check
  if (paste.expiresAt && now > paste.expiresAt) {
    await Paste.deleteOne({ _id: id });
    return null;
  }

  // View limit check
  if (paste.maxViews !== null && paste.viewsUsed >= paste.maxViews) {
    await Paste.deleteOne({ _id: id });
    return null;
  }

  // Increment views
  paste.viewsUsed += 1;
  await paste.save();

  // Cache it
  const payload = {
    content: paste.content,
    expiresAt: paste.expiresAt,
    maxViews: paste.maxViews,
    viewsUsed: paste.viewsUsed,
  };

  await redisClient.setEx(
    cacheKey,
    computeCacheTTL(paste, now),
    JSON.stringify(payload),
  );

  return payload;
}

const router = express.Router();

const escapeHtml = (str) =>
  str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );

router.post("/", async (req, res) => {
  const { content, ttl_seconds, max_views } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Invalid content" });
  }

  if (
    ttl_seconds !== undefined &&
    (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)
  ) {
    return res.status(400).json({ error: "Invalid ttl_seconds" });
  }

  if (
    max_views !== undefined &&
    (!Number.isInteger(max_views) || max_views < 1)
  ) {
    return res.status(400).json({ error: "Invalid max_views" });
  }

  const now = getNowMs(req);

  const paste = await Paste.create({
    _id: uuid(),
    content,
    createdAt: now,
    expiresAt: ttl_seconds ? now + ttl_seconds * 1000 : null,
    maxViews: max_views ?? null,
    viewsUsed: 0,
  });

  // const baseUrl = process.env.BASE_URL;

  res.status(201).json({
    id: paste._id,
    url: `/api/pastes/p/${paste._id}`,
  });
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const now = getNowMs(req);

    const paste = await readPasteWithCache(id, now);
    if (!paste) {
      return res.status(404).json({ error: "Paste not found" });
    }

    res.json({
      content: paste.content,
      remaining_views:
        paste.maxViews === null ? null : paste.maxViews - paste.viewsUsed,
      expires_at: paste.expiresAt
        ? new Date(paste.expiresAt).toISOString()
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// router.get("/p/:id", async (req, res) => {
//   try {
//     const paste = await Paste.findById(req.params.id);

//     if (!paste) {
//       return res.status(404).send("Paste not found");
//     }

//     const now = getNowMs(req);

//     if (paste.expiresAt && now > paste.expiresAt) {
//       await Paste.deleteOne({ _id: paste._id });
//       return res.status(404).json({ error: "Paste not found" });
//     }

//     if (paste.maxViews !== null && paste.viewsUsed >= paste.maxViews) {
//       await Paste.deleteOne({ _id: paste._id });
//       return res.status(404).json({ error: "Paste not found" });
//     }

//     paste.viewsUsed += 1;
//     await paste.save();

//     res.send(`
//       <html>
//         <body>
//           <pre>${escapeHtml(paste.content)}</pre>
//         </body>
//       </html>
//     `);
//   } catch {
//     res.status(500).send("Server error");
//   }
// });

router.get("/p/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const now = getNowMs(req);

    const paste = await readPasteWithCache(id, now);
    if (!paste) {
      return res.status(404).send("Paste not found");
    }

    res.send(`
      <html>
        <body>
          <pre>${escapeHtml(paste.content)}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
