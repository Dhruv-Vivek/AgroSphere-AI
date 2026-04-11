const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/** @type {Map<string, Record<string, unknown>>} */
const records = new Map();

router.post('/create', (req, res) => {
  const body = req.body || {};
  const id = uuidv4().slice(0, 8).toUpperCase();
  const record = {
    id,
    product: body.product || body.product_name || 'Crop batch',
    batch: body.batch || body.batch_id || `BATCH-${id}`,
    farmer: body.farmer || body.farmer_name || '—',
    location: body.location || '—',
    harvest_date: body.harvest_date || new Date().toISOString().slice(0, 10),
    certifications: Array.isArray(body.certifications) ? body.certifications : [],
    notes: body.notes || body.description || '',
    chain: [
      { step: 'Harvest', at: body.harvest_date || new Date().toISOString().slice(0, 10), detail: 'Recorded on AgroSphere' },
      { step: 'Registered', at: new Date().toISOString(), detail: 'Trace ID created' },
    ],
    created_at: new Date().toISOString(),
  };
  records.set(id, record);
  res.status(201).json(record);
});

router.get('/:id', (req, res) => {
  const id = String(req.params.id || '').toUpperCase();
  const rec = records.get(id);
  if (!rec) {
    return res.status(404).json({ error: 'Trace record not found' });
  }
  res.json(rec);
});

module.exports = router;
