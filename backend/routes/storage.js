const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const centers = [
  {
    id: 'cs1',
    name: 'Krishna Cold Chain Hub',
    city: 'Nashik',
    state: 'Maharashtra',
    crops: ['grapes', 'tomato', 'onion'],
    capacity_used_pct: 62,
    price_per_day: 120,
    rating: 4.6,
    temp_min_c: 2,
    temp_max_c: 8,
  },
  {
    id: 'cs2',
    name: 'Delta Agri Storage',
    city: 'Karnal',
    state: 'Haryana',
    crops: ['wheat', 'rice', 'potato'],
    capacity_used_pct: 41,
    price_per_day: 95,
    rating: 4.3,
    temp_min_c: 4,
    temp_max_c: 10,
  },
  {
    id: 'cs3',
    name: 'Coastal Fresh Store',
    city: 'Tuticorin',
    state: 'Tamil Nadu',
    crops: ['fish', 'chilli', 'banana'],
    capacity_used_pct: 78,
    price_per_day: 140,
    rating: 4.8,
    temp_min_c: -2,
    temp_max_c: 6,
  },
  {
    id: 'cs4',
    name: 'Plateau Produce Vault',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    crops: ['apple', 'potato', 'peas'],
    capacity_used_pct: 55,
    price_per_day: 110,
    rating: 4.5,
    temp_min_c: 0,
    temp_max_c: 8,
  },
  {
    id: 'cs5',
    name: 'Cauvery Cold Logistics',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    crops: ['tomato', 'onion', 'banana', 'coconut'],
    capacity_used_pct: 48,
    price_per_day: 125,
    rating: 4.7,
    temp_min_c: 2,
    temp_max_c: 10,
  },
  {
    id: 'cs6',
    name: 'Marina Agri Chill Hub',
    city: 'Chennai',
    state: 'Tamil Nadu',
    crops: ['rice', 'vegetables', 'flowers'],
    capacity_used_pct: 66,
    price_per_day: 135,
    rating: 4.5,
    temp_min_c: 4,
    temp_max_c: 12,
  },
  {
    id: 'cs7',
    name: 'Godavari Fresh Chain',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    crops: ['chilli', 'mango', 'rice', 'fish'],
    capacity_used_pct: 71,
    price_per_day: 128,
    rating: 4.4,
    temp_min_c: 0,
    temp_max_c: 8,
  },
  {
    id: 'cs8',
    name: 'Deccan Produce Vault',
    city: 'Hyderabad',
    state: 'Telangana',
    crops: ['tomato', 'mango', 'pulses', 'onion'],
    capacity_used_pct: 52,
    price_per_day: 118,
    rating: 4.6,
    temp_min_c: 3,
    temp_max_c: 10,
  },
  {
    id: 'cs9',
    name: 'Nandi Hills Cold Store',
    city: 'Bengaluru',
    state: 'Karnataka',
    crops: ['grapes', 'rose', 'potato', 'beans'],
    capacity_used_pct: 59,
    price_per_day: 145,
    rating: 4.8,
    temp_min_c: 2,
    temp_max_c: 8,
  },
  {
    id: 'cs10',
    name: 'Mysuru Mandi Cold Cell',
    city: 'Mysuru',
    state: 'Karnataka',
    crops: ['sugarcane_jaggery', 'potato', 'onion', 'banana'],
    capacity_used_pct: 44,
    price_per_day: 105,
    rating: 4.3,
    temp_min_c: 4,
    temp_max_c: 10,
  },
  {
    id: 'cs11',
    name: 'Backwaters Ice & Store',
    city: 'Kochi',
    state: 'Kerala',
    crops: ['fish', 'spices', 'banana', 'rubber_latex'],
    capacity_used_pct: 73,
    price_per_day: 152,
    rating: 4.9,
    temp_min_c: -2,
    temp_max_c: 4,
  },
  {
    id: 'cs12',
    name: 'Malabar Spice Cooler',
    city: 'Kozhikode',
    state: 'Kerala',
    crops: ['pepper', 'cardamom', 'coconut', 'arecanut'],
    capacity_used_pct: 38,
    price_per_day: 98,
    rating: 4.5,
    temp_min_c: 6,
    temp_max_c: 14,
  },
  {
    id: 'cs13',
    name: 'Coastal Karnataka Fish Cell',
    city: 'Mangaluru',
    state: 'Karnataka',
    crops: ['fish', 'cashew', 'coconut', 'rice'],
    capacity_used_pct: 81,
    price_per_day: 138,
    rating: 4.6,
    temp_min_c: -1,
    temp_max_c: 5,
  },
  {
    id: 'cs14',
    name: 'Puducherry Port Cold Line',
    city: 'Puducherry',
    state: 'Puducherry',
    crops: ['fish', 'rice', 'sugarcane', 'vegetables'],
    capacity_used_pct: 57,
    price_per_day: 122,
    rating: 4.4,
    temp_min_c: 2,
    temp_max_c: 9,
  },
];

/** @type {Array<Record<string, unknown>>} */
let marketplaceListings = [
  {
    id: 'm1',
    crop: 'Tomato',
    quantity_kg: 800,
    price_per_kg: 18,
    farmer_name: 'Ramesh Patil',
    location: 'Nashik, MH',
    expires_at: '2026-04-20',
    contact: '+91 98765 43210',
  },
  {
    id: 'm2',
    crop: 'Onion',
    quantity_kg: 2200,
    price_per_kg: 22,
    farmer_name: 'Sukhwinder Kaur',
    location: 'Karnal, HR',
    expires_at: '2026-05-01',
    contact: '+91 91234 56789',
  },
];

const cropBaseDays = {
  tomato: 12,
  onion: 45,
  potato: 60,
  wheat: 120,
  rice: 90,
  grapes: 10,
  banana: 7,
  apple: 60,
  default: 14,
};

const storageMultipliers = {
  'room temp': 1,
  'room_temp': 1,
  cold: 2.2,
  'cold storage': 2.2,
  refrigerated: 2.8,
};

function shelfLifeDays(crop, quantityKg, storageRaw) {
  const key = String(crop || 'default').toLowerCase().replace(/\s+/g, '_');
  const base = cropBaseDays[key] ?? cropBaseDays.default;
  const s = String(storageRaw || 'room temp').toLowerCase();
  const mult =
    storageMultipliers[s] ??
    (s.includes('cold') ? 2.2 : s.includes('refrig') ? 2.8 : 1);
  const qtyFactor = Math.max(0.85, 1 - Math.min(quantityKg, 5000) / 20000);
  return Math.max(1, Math.round(base * mult * qtyFactor));
}

function recommendAction(days) {
  if (days <= 3) return { recommendation: 'Sell or move to cold chain immediately', action: 'sell' };
  if (days <= 7) return { recommendation: 'Prioritize sale or donation this week', action: 'sell' };
  if (days <= 14) return { recommendation: 'Monitor daily; plan distribution', action: 'store' };
  return { recommendation: 'Safe to store; schedule quality checks', action: 'store' };
}

router.get('/centers', (req, res) => {
  const { state, crop } = req.query;
  let list = [...centers];
  if (state && String(state).trim()) {
    const q = String(state).toLowerCase();
    list = list.filter((c) => c.state.toLowerCase().includes(q));
  }
  if (crop && String(crop).trim()) {
    const q = String(crop).toLowerCase();
    list = list.filter((c) => c.crops.some((x) => x.includes(q)));
  }
  res.json(list);
});

router.post('/shelf-life', (req, res) => {
  const { crop, quantity, current_storage } = req.body || {};
  if (!crop) {
    return res.status(400).json({ error: 'crop is required' });
  }
  const qty = Number(quantity) || 0;
  const days_remaining = shelfLifeDays(crop, qty, current_storage);
  const { recommendation, action } = recommendAction(days_remaining);
  res.json({ days_remaining, recommendation, action });
});

router.get('/marketplace', (_req, res) => {
  res.json(marketplaceListings);
});

router.post('/list', (req, res) => {
  const { crop, quantity, price, description, contact } = req.body || {};
  if (!crop || quantity == null || price == null) {
    return res.status(400).json({ error: 'crop, quantity, and price are required' });
  }
  const row = {
    id: uuidv4(),
    crop: String(crop),
    quantity_kg: Number(quantity) || 0,
    price_per_kg: Number(price) || 0,
    farmer_name: 'You (listed)',
    location: 'Your location',
    expires_at: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    contact: contact ? String(contact) : '—',
    description: description ? String(description) : '',
  };
  marketplaceListings = [row, ...marketplaceListings];
  res.status(201).json(row);
});

module.exports = router;
