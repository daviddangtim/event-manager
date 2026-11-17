import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
// import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Global Error Handler
// app.use(errorHandler);

// WebSocket Broadcast for Local Hall Network Sync
export function broadcastToHallGates(payload: object) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Gate scanner connected to hall sync network');
  ws.on('error', console.error);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Event Hall API & LAN Sync Server running on port ${PORT}`);
});