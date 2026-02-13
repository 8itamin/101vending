'use strict';

require('dotenv').config();

const mqtt = require('mqtt');
const { connectMongo } = require('../shared/mongo');
const { MachineState, Reading } = require('../shared/models');
const { parseTopic, parsePayload } = require('../shared/utils');

const MQTT_PROTOCOL = process.env.MQTT_PROTOCOL || 'mqtts';
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = Number(process.env.MQTT_PORT || 8883);
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'vending_ingestor';
const MQTT_REJECT_UNAUTHORIZED =
  String(process.env.MQTT_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true';

const MQTT_TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX || 'vending_machine';
const MQTT_SUBSCRIBE_TOPIC =
  process.env.MQTT_SUBSCRIBE_TOPIC || `${MQTT_TOPIC_PREFIX}/#`;

if (!MQTT_HOST || !MQTT_USERNAME || !MQTT_PASSWORD) {
  throw new Error('MQTT_HOST / MQTT_USERNAME / MQTT_PASSWORD are required');
}

async function saveStateAndReading({ machineId, metric, topic, value, rawType, numericValue }) {
  const now = new Date();

  await MachineState.findOneAndUpdate(
    { machineId },
    {
      $set: {
        [`metrics.${metric}`]: { value, ts: now, rawType },
        lastSeenAt: now,
      },
      $setOnInsert: { machineId },
    },
    { upsert: true, returnDocument: 'after' }
  );

  await Reading.create({
    machineId,
    metric,
    topic,
    value,
    numericValue,
    rawType,
    ts: now,
  });
}

async function main() {
  // 1) Mongo first
  await connectMongo();

  // 2) MQTT
  const brokerUrl = `${MQTT_PROTOCOL}://${MQTT_HOST}:${MQTT_PORT}`;
  const mqttOptions = {
    protocol: MQTT_PROTOCOL,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    port: MQTT_PORT,
    clientId: MQTT_CLIENT_ID,
    rejectUnauthorized: MQTT_REJECT_UNAUTHORIZED,
  };

  const client = mqtt.connect(brokerUrl, mqttOptions);

  client.on('connect', () => {
    console.log('Connected to MQTT broker:', brokerUrl);
    client.subscribe(MQTT_SUBSCRIBE_TOPIC, { qos: 1 }, (err) => {
      if (err) console.error('MQTT subscribe error:', err);
      else console.log('Subscribed to:', MQTT_SUBSCRIBE_TOPIC);
    });
  });

  client.on('error', (err) => console.error('MQTT error ❌', err));

  client.on('message', async (topic, message) => {
    try {
      const info = parseTopic(topic);
      if (!info) return;

      // если нужно строго фильтровать по prefix:
      // if (info.prefix !== MQTT_TOPIC_PREFIX) return;

      const parsed = parsePayload(message);
      await saveStateAndReading({
        machineId: info.machineId,
        metric: info.metric,
        topic,
        ...parsed,
      });

      console.log(`[${info.machineId}] ${info.metric} =`, parsed.value);
    } catch (e) {
      console.error('Error handling message:', e);
    }
  });
}

main().catch((e) => {
  console.error('Ingestor startup failed ❌', e);
  process.exit(1);
});
