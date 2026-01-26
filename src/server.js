require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./db");
const healthRoutes = require("./routes/health");
const pasteRoutes = require("./routes/pastes");

const localRateLimiter = require('./middlewares/localRateLimiter');
const globalRateLimiter = require('./middlewares/globalRateLimiter');

const app = express();

app.use(cors());
app.use(express.json());

app.use(localRateLimiter);
app.use(globalRateLimiter);

app.get("/debug", (req, res) => {
  res.send("Server is running");
});
app.use("/api/healthz", healthRoutes);
app.use("/api/pastes", pasteRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 3000;

const main = async () =>{
    await connectDB();
    app.listen(PORT, () => console.log("Server running on", PORT));
}

main();
