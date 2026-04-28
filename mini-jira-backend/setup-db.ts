import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const host = process.env.DB_HOST ?? 'localhost';
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME ?? 'mini_jira';

// Step 1: create database
const root = await mysql.createConnection({ host, port, user, password });
await root.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
await root.end();
console.log(`Database '${database}' OK`);

// Step 2: run table statements connected to the database
const sql = fs.readFileSync(path.resolve('create-tables.sql'), 'utf-8');
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE '));

const conn = await mysql.createConnection({ host, port, user, password, database });
console.log('Creando tablas...');

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    const match = stmt.match(/CREATE TABLE(?: IF NOT EXISTS)?\s+`?(\w+)`?/i);
    if (match) console.log(`  OK: ${match[1]}`);
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
  }
}

await conn.end();
console.log('Listo.');
