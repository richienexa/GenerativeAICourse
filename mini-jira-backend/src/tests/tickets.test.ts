import { describe, it, expect, beforeAll } from 'bun:test';
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT ?? 3001}`;

let adminToken = '';
let createdTicketId = '';
let adminUserId = '';

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json() as { accessToken: string; user: { id: string } };
  adminUserId = body.user.id;
  return body.accessToken;
}

beforeAll(async () => {
  adminToken = await login('admin@nexabanco.com', 'admin1234');
});

describe('GET /api/tickets', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`);
    expect(res.status).toBe(401);
  });

  it('returns paginated result', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; page: number; limit: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.page).toBe('number');
    expect(typeof body.limit).toBe('number');
  });

  it('filters by search', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets?search=zzznomatchxxx`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data.length).toBe(0);
  });
});

describe('POST /api/tickets', () => {
  it('creates a ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test ticket from tests',
        priority: 'medium',
        assignee_ids: [adminUserId],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; title: string };
    expect(body.title).toBe('Test ticket from tests');
    createdTicketId = body.id;
  });

  it('rejects missing title', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priority: 'high', assignee_ids: [adminUserId] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id', () => {
  it('updates ticket status', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/${createdTicketId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('in_progress');
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/not-a-uuid`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tickets/:id/activity', () => {
  it('returns activity log for ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/${createdTicketId}/activity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ action: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((e) => e.action === 'created')).toBe(true);
  });
});

describe('DELETE /api/tickets/:id', () => {
  it('archives the ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/${createdTicketId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(204);
  });
});
