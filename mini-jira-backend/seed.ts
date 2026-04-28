import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mini_jira',
});

const users = [
  { name: 'Admin Nexa', email: 'admin@nexabanco.com', password: 'admin1234', role: 'admin' },
  { name: 'Juan Castillos', email: 'jcastillos@nexabanco.com', password: 'nexa1234', role: 'member' },
];

console.log('Insertando usuarios...');

for (const u of users) {
  const id = uuidv4();
  const hash = await bcrypt.hash(u.password, 10);
  await conn.execute(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
    [id, u.name, u.email, hash, u.role]
  );
  console.log(`  OK: ${u.email} (${u.role}) — password: ${u.password}`);
}

await conn.end();
console.log('Seed completo.');
