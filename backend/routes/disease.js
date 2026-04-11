const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const mockPath = path.join(__dirname, "..", "data", "disease_mock.json");

function loadMockResponses() {
  try {
    const raw = fs.readFileSync(mockPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function pickMock() {
  const list = loadMockResponses();
  if (list.length === 0) {
    return {
      is_healthy: false,
      results: [
        {
          name: "Unknown stress (mock)",
          confidence: 80,
          description: "Could not reach Plant.id and no mock file — placeholder response.",
          treatment: "Re-upload a clear leaf photo; ensure good lighting and focus.",
          affected_crops: [],
          severity: "Low",
          image_symptoms: "N/A",
        },
      ],
    };
  }
  return list[Math.floor(Math.random() * list.length)];
}

router.post("/analyze", upload.single("image"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      ok: false,
      error: "Missing file field `image`",
      data: pickMock(),
      fallback: true,
    });
  }

  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: true,
      data: pickMock(),
      fallback: true,
      message: "PLANT_ID_API_KEY missing — mock data",
    });
  }

  const base64 = req.file.buffer.toString("base64");
  const url = "https://api.plant.id/v3/health_assessment";

  try {
    const { data } = await axios.post(
      url,
      {
        images: [base64],
        language: "en",
        disease_details: ["cause", "description", "treatment", "classification"],
      },
      {
        headers: {
          "Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    return res.json({ ok: true, data, fallback: false });
  } catch (err) {
    console.error("disease Plant.id:", err.response?.data || err.message);
    return res.json({
      ok: true,
      data: pickMock(),
      fallback: true,
      message: "Plant.id request failed — mock data",
    });
  }
});

router.get("/mock", (req, res) => {
  try {
    res.json({ ok: true, data: pickMock(), fallback: true });
  } catch (err) {
    console.error("disease /mock:", err.message);
    res.status(500).json({ ok: false, error: "Mock failed", data: pickMock(), fallback: true });
  }
});

module.exports = router;
