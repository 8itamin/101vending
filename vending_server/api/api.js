'use strict';

require('dotenv').config();

const express = require('express');
const { connectMongo } = require('../shared/mongo');
const { MachineState, Reading } = require('../shared/models');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

async function main() {
  await connectMongo();

  // Текущее состояние всех автоматов
  app.get('/api/machines', async (req, res) => {
    try {
      const items = await MachineState.find().sort({ updatedAt: -1 });
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching machines', error: String(err) });
    }
  });

  // Текущее состояние одного автомата
  app.get('/api/machines/:id', async (req, res) => {
    try {
      const item = await MachineState.findOne({ machineId: req.params.id });
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching machine', error: String(err) });
    }
  });

  // История показаний (фильтры: machineId, metric, limit)
  app.get('/api/readings', async (req, res) => {
    try {
      const { machineId, metric } = req.query;
      const limit = Math.min(Number(req.query.limit || 200), 2000);

      const q = {};
      if (machineId) q.machineId = machineId;
      if (metric) q.metric = metric;

      const items = await Reading.find(q).sort({ ts: -1 }).limit(limit);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching readings', error: String(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`API server is running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('API startup failed ❌', e);
  process.exit(1);
});
