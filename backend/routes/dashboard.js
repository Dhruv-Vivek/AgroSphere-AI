const express = require("express");
const { getDemoFarmState, getCachedDemoDecision } = require("../services/decisionEngine");
const { getLastBrainDecision } = require("../services/farmRuntimeState");

const router = express.Router();

/**
 * Derive which farm workflow step is "current" based on actual zone data.
 * Steps: 0=Soil analysis, 1=Crop planning, 2=Drone survey, 3=Disease check, 4=Market intel, 5=Harvest
 */
function deriveWorkflowStep(farm, brainDecision) {
  const zones = farm?.zones || [];
  if (!zones.length) return { step: 0, reason: "No zones found" };

  const allStages = zones.map((z) => (z.growth_stage || "").toLowerCase());
  const avgDays = zones.reduce((s, z) => s + (z.days_since_sowing || 0), 0) / zones.length;

  const hasCritical = brainDecision?.zones
    ? Object.values(brainDecision.zones).some((z) => z.status === "critical")
    : false;
  const overallHealth = brainDecision?.farm_summary?.overall_health ?? 80;

  if (allStages.some((s) => s.includes("harvest") || s.includes("maturity")))
    return { step: 5, reason: "One or more zones ready for harvest" };

  if (allStages.some((s) => s.includes("fruiting") || s.includes("grain")) && avgDays > 80)
    return { step: 4, reason: "Crops in late stage — check market timing" };

  if (hasCritical || overallHealth < 60)
    return { step: 3, reason: "Critical alerts detected — AI disease check recommended" };

  if (allStages.some((s) => s.includes("flower") || s.includes("reproductive")))
    return { step: 2, reason: "Crops in flowering stage — aerial health scan due" };

  if (allStages.some((s) => s.includes("germination") || s.includes("seedling")))
    return { step: 1, reason: "Seeds germinating — finalize crop plan" };

  if (allStages.some((s) => s.includes("vegetative")))
    return { step: 2, reason: "Active vegetative growth — drone survey recommended" };

  return { step: 1, reason: "Farm active — review crop planning" };
}

/** GET /api/dashboard */
router.get("/", (req, res) => {
  const farm = getDemoFarmState();
  const brain = getLastBrainDecision("demo") || getCachedDemoDecision();
  const zones = farm?.zones || [];

  const overallHealth = brain?.farm_summary?.overall_health ?? 84;
  const criticalCount = brain?.farm_summary?.critical_alerts_count ?? 1;
  const crops = [...new Set(zones.map((z) => z.crop).filter(Boolean))];

  const PRICE_MAP = { maize: 18, wheat: 22, rice: 20, tomato: 14, cotton: 62 };
  const estRevenue = zones.reduce((sum, z) => {
    const yieldKg = (brain?.zones?.[z.id]?.yield_forecast?.expected_kg_per_acre ?? 1500) * z.acres;
    const price = PRICE_MAP[z.crop] || 20;
    return sum + (yieldKg * price) / 100;
  }, 0);

  res.json({
    ok: true,
    data: {
      health: overallHealth,
      alerts: criticalCount,
      crops: crops.length,
      revenue: Math.round(estRevenue),
      cropHealth: zones.map((z) => ({
        crop: z.crop,
        health: brain?.zones?.[z.id]?.health_score ?? 80,
      })),
    },
  });
});

/** GET /api/dashboard/workflow?farmId=demo */
router.get("/workflow", (req, res) => {
  const farmId = String(req.query.farmId || "demo").trim() || "demo";
  const farm = getDemoFarmState();
  const brain = getLastBrainDecision(farmId) || getCachedDemoDecision();

  const { step, reason } = deriveWorkflowStep(farm, brain);

  const zoneSummaries = (farm.zones || []).map((z) => {
    const bd = brain?.zones?.[z.id];
    return {
      id: z.id,
      label: z.label || `Zone ${z.id}`,
      crop: z.crop,
      acres: z.acres,
      growth_stage: z.growth_stage,
      days_since_sowing: z.days_since_sowing,
      health_score: bd?.health_score ?? null,
      status: bd?.status ?? "unknown",
      top_alert: Array.isArray(bd?.alerts) && bd.alerts.length ? bd.alerts[0] : null,
      next_irrigation: bd?.irrigation?.next_schedule ?? null,
      moisture_pct: z.soil?.moisture_pct ?? null,
    };
  });

  res.json({
    ok: true,
    farmId,
    currentStep: step,
    reason,
    topAction: brain?.farm_summary?.top_priority_action ?? null,
    farmName: farm.farm_name,
    totalAcres: farm.total_acres,
    overallHealth: brain?.farm_summary?.overall_health ?? null,
    zones: zoneSummaries,
    usedLiveBrain: Boolean(getLastBrainDecision(farmId)),
  });
});

module.exports = router;