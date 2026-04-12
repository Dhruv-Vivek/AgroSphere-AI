process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health routes
app.get("/", (req, res) => {
  res.json({ status: "AgroSphere backend running" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "AgroSphere AI backend" });
});

// ✅ Routes (SAFE LOADING)
try {
  app.use("/api/chatbot", require("./routes/chatbot"));
  app.use("/api/farm-intel", require("./routes/farmIntel"));
  app.use("/api/market", require("./routes/marketRoutes"));
  app.use("/api/disease", require("./routes/disease"));
  app.use("/api/drone", require("./routes/drone"));
  app.use("/api/irrigation", require("./routes/irrigation"));
  app.use("/api/storage", require("./routes/storage"));
  app.use("/api/schemes", require("./routes/schemes"));
  app.use("/api/trace", require("./routes/trace"));
} catch (err) {
  console.error("❌ Route loading failed:", err.message);
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Port error handling
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[AgroSphere] Port ${PORT} is already in use.\n` +
      "  • Stop other server OR change port in .env\n"
    );
    process.exit(1);
  }
  throw err;
});