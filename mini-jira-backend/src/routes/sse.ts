import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth';

const router = Router();

// In-memory client registry: ticketId → Set<Response>
const boardClients = new Set<Response>();

export function broadcastBoardUpdate(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of boardClients) {
    client.write(payload);
  }
}

// GET /api/sse/board
router.get('/board', verifyToken, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  boardClients.add(res);

  // Heartbeat every 20s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    boardClients.delete(res);
  });
});

export default router;
