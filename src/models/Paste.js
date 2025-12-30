const mongoose = require("mongoose");

const PasteSchema = new mongoose.Schema(
  {
    _id: {
      type: String,   // 👈 IMPORTANT
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Number,
      required: true
    },
    expiresAt: {
      type: Number,
      default: null
    },
    maxViews: {
      type: Number,
      default: null
    },
    viewsUsed: {
      type: Number,
      default: 0
    }
  },
  { _id: false } // 👈 prevents ObjectId auto-generation
);

module.exports = mongoose.model("Paste", PasteSchema);
