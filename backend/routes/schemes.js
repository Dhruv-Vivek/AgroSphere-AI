const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function loadSchemes() {
  const file = path.join(__dirname, '..', 'data', 'schemes.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

router.get('/', (_req, res) => {
  res.json(loadSchemes());
});

router.post('/check-eligibility', (req, res) => {
  const { land_acres, income, category } = req.body || {};
  const land = Number(land_acres);
  const inc = Number(income);
  const cat = String(category || 'General');

  const schemes = loadSchemes();
  const eligible = [];
  const partially_eligible = [];

  for (const s of schemes) {
    const rules = s.rules || {};
    let score = 100;
    const reasons = [];

    if (rules.max_income != null && inc > rules.max_income) {
      score -= 40;
      reasons.push(`Income above typical threshold (>${rules.max_income} INR)`);
    }
    if (rules.max_land_acres != null && land > rules.max_land_acres) {
      score -= 30;
      reasons.push(`Land holding above scheme cap`);
    }
    const cats = rules.categories;
    if (Array.isArray(cats) && !cats.includes(cat) && !cats.includes('General')) {
      score -= 20;
      reasons.push('Category may need verification');
    }

    if (score >= 85) eligible.push({ ...s, match_note: 'Likely eligible — verify documents' });
    else if (score >= 55) partially_eligible.push({ ...s, reasons });
    else partially_eligible.push({ ...s, reasons: reasons.length ? reasons : ['Check detailed criteria on portal'] });
  }

  res.json({ eligible, partially_eligible });
});

module.exports = router;
