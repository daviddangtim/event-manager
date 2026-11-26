import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './src/routes/index.ts';
import {errorHandler}  from './src/middleware/errorHandler.ts';
import * as redis from './src/config/redis.ts';
import { hydrateRedisCache } from './src/utils/cacheHydrator.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(cors());

app.use(morgan('dev'))

app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);


redis.redisSub.subscribe('hall-gate-sync', (err, count) => {
  if (err) {
    console.error('Failed to subscribe to Redis channel:', err);
  } else {
    console.log(`Subscribed to hall-gate-sync channel. Active subscribers: ${count}`);
  }
});

redis.redisSub.on('message', (channel, message) => {
  if (channel === 'hall-gate-sync') {
    const data = JSON.parse(message);
    console.log(`[LAN Sync Event] Access code ${data.accessCode} checked in at Gate ${data.gateId}`);
  }
});

const PORT = process.env.PORT || 4000;


async function startServer() {
  try {
    await hydrateRedisCache();
  } catch (error) {
    console.error('Failed to hydrate Redis cache on startup:', error);
  }

  server.listen(PORT, () => {
    console.log(`Event Hall API Server running on port ${PORT}`);
  });
}

startServer();