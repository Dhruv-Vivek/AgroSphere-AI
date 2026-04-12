const { getDemoFarmState, getCachedDemoDecision } = require("./decisionEngine");
const { getLastBrainDecision } = require("./farmRuntimeState");

function seasonHint(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m >= 6 && m <= 9) return "Kharif / monsoon dominant";
  if (m >= 10 || m <= 2) return "Rabi / post-monsoon";
  return "Zaid / summer window";
}

function estimateDaysToHarvest(crop, growthStage, daysSince) {
  const rough = {
    maize: { vegetative: 75, flowering: 40, maturity: 15 },
    wheat: { vegetative: 90, reproductive: 45 },
    tomato: { flowering: 50, fruiting: 35 },
    rice: { germination: 100, vegetative: 80 },
  };
  const c = rough[crop] || { vegetative: 60 };
  const stage = (growthStage || "vegetative").toLowerCase();
  const total = Object.values(c).reduce((a, b) => a + b, 120);
  const remaining = Math.max(0, total - (daysSince || 0));
  return remaining;
}

/**
 * Build JSON matching Krishi <farm_context> contract (demo data + live brain when available).
 * @param {string} farmId
 */
function buildFarmContextObject(farmId = "demo") {
  const farm = getDemoFarmState();
  const brain = getLastBrainDecision(farmId) || getCachedDemoDecision();
  const now = new Date();

  const active_alerts = [];
  if (brain?.zones) {
    for (const [zoneId, z] of Object.entries(brain.zones)) {
      const list = Array.isArray(z.alerts) ? z.alerts : [];
      for (const message of list) {
        active_alerts.push({
          zone_id: zoneId,
          type: z.status === "critical" ? "critical_stress" : "advisory",
          severity: z.status || "info",
          message,
          triggered_at: now.toISOString(),
        });
      }
    }
  }

  const zones = (farm.zones || []).map((z) => ({
    zone_id: z.id,
    name: z.label || z.id,
    crop: z.crop,
    acres: z.acres,
    sowing_relative_days: z.days_since_sowing,
    growth_stage: z.growth_stage,
    days_to_harvest_estimate: estimateDaysToHarvest(z.crop, z.growth_stage, z.days_since_sowing),
    sensors: {
      ph: z.soil?.ph,
      moisture_pct: z.soil?.moisture_pct,
      humidity_pct: z.sensors?.humidity_pct,
      temperature_c: z.sensors?.temp_c,
      nitrogen_mg_kg: z.soil?.N,
      phosphorus_mg_kg: z.soil?.P,
      potassium_mg_kg: z.soil?.K,
      organic_matter_pct: z.soil?.organic_matter_pct,
    },
    last_irrigation_hours_ago: z.last_irrigation_hours_ago,
  }));

  return {
    farm_id: farm.farm_id,
    farm_name: farm.farm_name,
    total_acres: farm.total_acres,
    location: { lat: 20.59, lon: 78.96, label: "Demo coordinates (India)" },
    current_date: now.toISOString().slice(0, 10),
    season: seasonHint(now),
    zones,
    active_alerts,
    borewell: {
      status: farm.borewell?.motor_on ? "active" : farm.borewell?.status || "idle",
      water_table_m: farm.borewell?.water_table_m,
      flow_rate_lpm: farm.borewell?.flow_rate_lpm,
      motor_hp: farm.borewell?.motor_hp,
      depth_ft: farm.borewell?.depth_ft,
      motor_runtime_today_hrs: 2.4,
    },
    last_ai_brain_decision: brain?.farm_summary || null,
  };
}

function buildFarmContextJson(farmId) {
  return JSON.stringify(buildFarmContextObject(farmId), null, 2);
}

module.exports = {
  buildFarmContextObject,
  buildFarmContextJson,
};
