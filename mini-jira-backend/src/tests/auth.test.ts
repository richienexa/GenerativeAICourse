import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT ?? 3001}`;

// Test credentials — seeded in DB
const ADMIN = { email: 'admin@nexabanco.com', password: 'admin1234' };
const MEMBER = { email: 'jcastillos@nexabanco.com', password: 'nexa1234' };

let adminToken = '';
let memberToken = '';

describe('POST /api/auth/login', () => {
  it('rejects missing body', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('rejects wrong password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN.email, password: 'wrongpassword' }),
    });
    expect(res.status).toBe(401);
  });

  it('logs in as admin', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { accessToken: string; user: { role: string } };
    expect(body.accessToken).toBeTruthy();
    expect(body.user.role).toBe('admin');
    adminToken = body.accessToken;
  });

  it('logs in as member', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(MEMBER),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { accessToken: string };
    memberToken = body.accessToken;
  });
});

describe('GET /api/auth/me', () => {
  it('requires auth', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it('returns current user', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { email: string; role: string };
    expect(body.email).toBe(ADMIN.email);
    expect(body.role).toBe('admin');
  });
});

export { adminToken, memberToken };
