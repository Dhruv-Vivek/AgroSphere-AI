/** In-memory last AI brain decision per farm (no DB). Synced from /api/ai/analyze. */

/** @type {Map<string, object>} */
const lastBrainByFarm = new Map();

function setLastBrainDecision(farmId, decision) {
  const id = String(farmId || "demo").trim() || "demo";
  if (decision && typeof decision === "object") {
    lastBrainByFarm.set(id, decision);
  }
}

function getLastBrainDecision(farmId) {
  const id = String(farmId || "demo").trim() || "demo";
  return lastBrainByFarm.get(id) || null;
}

module.exports = {
  setLastBrainDecision,
  getLastBrainDecision,
};
