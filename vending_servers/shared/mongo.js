'use strict';

const mongoose = require('mongoose');

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB || undefined;

  if (!uri) throw new Error('MONGO_URI is required');

  mongoose.set('bufferCommands', false);

  mongoose.connection.on('connected', () => console.log('Mongo connected ✅'));
  mongoose.connection.on('disconnected', () => console.log('Mongo disconnected ⚠️'));
  mongoose.connection.on('error', (e) => console.error('Mongo error ❌', e));

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 30000,
  });
}

module.exports = { connectMongo, mongoose };
