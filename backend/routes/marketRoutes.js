const express = require("express");
const marketController = require("../controllers/marketController");

const router = express.Router();

router.get("/news", marketController.getNews);
router.get("/prices", marketController.getPrices);
router.get("/analysis", marketController.getAnalysis);

// Preserve existing routes such as /prices/:name and /by-state.
router.use("/", require("./market"));

module.exports = router;
