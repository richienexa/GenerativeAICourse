import 'dotenv/config';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mini_jira',
});

// Obtener usuarios existentes
const [userRows] = await conn.query<mysql.RowDataPacket[]>('SELECT id, email FROM users');
const admin = userRows.find((u) => u.email === 'admin@nexabanco.com')!;
const juan  = userRows.find((u) => u.email === 'jcastillos@nexabanco.com')!;

console.log('Usuarios:', admin.email, juan.email);

// ── Labels ────────────────────────────────────────────────────────────────────

const labelDefs = [
  { name: 'frontend' },
  { name: 'backend' },
  { name: 'bug' },
  { name: 'mejora' },
  { name: 'seguridad' },
  { name: 'base de datos' },
  { name: 'infra' },
  { name: 'UX' },
];

console.log('\nInsertando labels...');
const labelIds: Record<string, string> = {};
for (const l of labelDefs) {
  const id = uuidv4();
  await conn.execute(
    `INSERT INTO labels (id, name, created_by_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [id, l.name, admin.id],
  );
  const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT id FROM labels WHERE name = ?', [l.name]);
  labelIds[l.name] = rows[0].id;
  console.log(`  OK: ${l.name} → ${labelIds[l.name]}`);
}

// ── Tickets ───────────────────────────────────────────────────────────────────

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

const tickets = [
  // TODO
  {
    title: 'Configurar pipeline de CI/CD en GitHub Actions',
    description: `## Objetivo\nAutomatizar el proceso de build, test y deploy.\n\n## Tareas\n- [ ] Crear workflow de build\n- [ ] Agregar ejecución de tests unitarios\n- [ ] Configurar deploy a staging en merge a \`main\`\n- [ ] Notificaciones de fallo por Slack\n\n## Referencias\n- [Docs GitHub Actions](https://docs.github.com/actions)`,
    status: 'todo',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['infra'],
    createdAt: daysAgo(10),
  },
  {
    title: 'Diseñar pantalla de perfil de usuario',
    description: `## Descripción\nCrear la vista de perfil donde el usuario puede ver y editar sus datos.\n\n## Criterios de aceptación\n- Mostrar nombre, email y rol\n- Permitir cambio de contraseña\n- Avatar generado por iniciales\n\n## Notas de diseño\nSeguir el sistema de diseño Material 3 ya implementado en el proyecto.`,
    status: 'todo',
    priority: 'medium',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['frontend', 'UX'],
    createdAt: daysAgo(8),
  },
  {
    title: 'Agregar paginación en la API de tickets',
    description: `## Problema\nCon muchos tickets el endpoint \`GET /api/tickets\` devuelve todo sin paginar, lo que puede ser lento.\n\n## Solución propuesta\nAgregar query params \`page\` y \`limit\` con defaults razonables.\n\n\`\`\`\nGET /api/tickets?page=1&limit=20\n\`\`\`\n\n## Respuesta esperada\n\`\`\`json\n{\n  "data": [...],\n  "total": 87,\n  "page": 1,\n  "limit": 20\n}\n\`\`\``,
    status: 'todo',
    priority: 'low',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['backend'],
    createdAt: daysAgo(5),
  },
  {
    title: 'Implementar recuperación de contraseña por email',
    description: `## Descripción\nFlujo de reset de contraseña vía email.\n\n## Flujo\n1. Usuario ingresa su email en \`/forgot-password\`\n2. Backend genera token con expiración de 1 hora\n3. Se envía email con link de reset\n4. Usuario hace click, ingresa nueva contraseña\n5. Token se invalida\n\n## Pendiente\n- Definir proveedor de email (SendGrid / Resend)`,
    status: 'todo',
    priority: 'medium',
    is_blocked: true,
    assignees: [admin.id, juan.id],
    labels: ['backend', 'seguridad'],
    createdAt: daysAgo(3),
  },

  // IN PROGRESS
  {
    title: 'Refactorizar autenticación a middleware reutilizable',
    description: `## Contexto\nActualmente la verificación del JWT está duplicada en varias rutas. Se necesita centralizar en un middleware.\n\n## Trabajo en curso\n- [x] Extraer \`verifyToken\` a \`src/middleware/auth.ts\`\n- [x] Aplicar en rutas de tickets\n- [ ] Aplicar en rutas de comentarios\n- [ ] Aplicar en rutas de métricas\n- [ ] Tests de integración\n\n## Archivos modificados\n- \`src/middleware/auth.ts\`\n- \`src/routes/tickets.ts\``,
    status: 'in_progress',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['backend', 'seguridad'],
    createdAt: daysAgo(12),
  },
  {
    title: 'Implementar filtros avanzados en el tablero Kanban',
    description: `## Descripción\nAgregar filtros combinables en el board: por prioridad, asignado, etiqueta y fecha.\n\n## Estado actual\n- [x] Filtro por estado (columnas)\n- [x] UI de filtros creada\n- [ ] Conectar filtros al query de la API\n- [ ] Persistir filtros en URL params\n\n## Diseño\nLos filtros deben ser visibles en la parte superior del board y colapsar en mobile.`,
    status: 'in_progress',
    priority: 'medium',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['frontend', 'UX'],
    createdAt: daysAgo(7),
  },
  {
    title: 'Optimizar consultas N+1 en endpoint de tickets',
    description: `## Problema detectado\nEl endpoint \`GET /api/tickets\` genera consultas N+1 para obtener asignados y etiquetas de cada ticket.\n\n## Profiling\n- 50 tickets → 101 queries\n- Latencia promedio: 850ms\n\n## Solución\nBatch fetch con \`WHERE ticketId IN (...)\` para asignados y etiquetas.\n\n## Meta\n- Reducir a máximo 3 queries por request\n- Latencia objetivo: < 100ms`,
    status: 'in_progress',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id, juan.id],
    labels: ['backend', 'base de datos'],
    createdAt: daysAgo(6),
  },

  // REVIEW
  {
    title: 'Agregar validación con Zod en todos los endpoints',
    description: `## Descripción\nEstandarizar la validación de request bodies usando Zod en todos los endpoints de la API.\n\n## Completado\n- [x] \`POST /api/auth/login\`\n- [x] \`POST /api/tickets\`\n- [x] \`PATCH /api/tickets/:id\`\n- [x] \`POST /api/comments\`\n\n## En revisión\nPR #12 — revisar que los mensajes de error sean descriptivos y estén en español.\n\n## Testing\n\`\`\`bash\ncurl -X POST http://localhost:3001/api/tickets \\\\\n  -H "Content-Type: application/json" \\\\\n  -d '{"title": ""}'\n# → 400 { error: "Validation error", details: [...] }\n\`\`\``,
    status: 'review',
    priority: 'medium',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['backend'],
    createdAt: daysAgo(14),
  },
  {
    title: 'Crear componente TicketCard con drag & drop',
    description: `## Descripción\nComponente de tarjeta de ticket arrastrable para el tablero Kanban usando \`@dnd-kit\`.\n\n## Implementado\n- [x] Card con título, prioridad y asignados\n- [x] Drag handle\n- [x] Drop entre columnas\n- [x] Actualización optimista del estado\n\n## Pendiente de revisión\n- Accesibilidad del drag & drop (teclado)\n- Comportamiento en mobile\n\n## Screenshots\n_Ver PR #15 para capturas de pantalla_`,
    status: 'review',
    priority: 'high',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['frontend'],
    createdAt: daysAgo(9),
  },
  {
    title: 'Documentar endpoints de la API en Swagger',
    description: `## Objetivo\nGenerar documentación interactiva de la API con Swagger/OpenAPI 3.0.\n\n## Alcance\n- Todos los endpoints de \`/api/auth\`\n- Todos los endpoints de \`/api/tickets\`\n- Todos los endpoints de \`/api/comments\`\n- Schemas de request/response\n- Ejemplos de uso\n\n## Herramienta\n\`swagger-jsdoc\` + \`swagger-ui-express\`\n\n## Estado\nEsperando revisión del equipo antes de mergear.`,
    status: 'review',
    priority: 'low',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['backend'],
    createdAt: daysAgo(4),
  },

  // DONE
  {
    title: 'Configurar proyecto base con Express + TypeScript',
    description: `## Completado\nSetup inicial del backend con:\n- Express 4\n- TypeScript + ts-node\n- Drizzle ORM\n- MySQL2\n- dotenv\n- ESLint + Prettier\n\n## Estructura definida\n\`\`\`\nsrc/\n  db/\n  middleware/\n  routes/\n  validators/\n  index.ts\n\`\`\``,
    status: 'done',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['backend', 'infra'],
    createdAt: daysAgo(30),
  },
  {
    title: 'Diseñar schema de base de datos',
    description: `## Tablas creadas\n- \`users\` — autenticación y roles\n- \`tickets\` — entidad principal\n- \`ticket_assignees\` — relación N:M tickets-usuarios\n- \`ticket_labels\` — relación N:M tickets-etiquetas\n- \`labels\` — catálogo de etiquetas\n- \`comments\` — comentarios por ticket\n- \`attachments\` — archivos adjuntos\n- \`refresh_tokens\` — tokens JWT\n\n## Decisiones de diseño\n- UUIDs como PKs para evitar enumeración\n- Soft delete con \`archived_at\`\n- Timestamps en todas las tablas`,
    status: 'done',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id, juan.id],
    labels: ['base de datos'],
    createdAt: daysAgo(28),
  },
  {
    title: 'Implementar sistema de autenticación JWT',
    description: `## Implementado\n- Login con email + contraseña (bcrypt)\n- Access token (30 min)\n- Refresh token (7 días, httpOnly cookie)\n- Logout con invalidación del refresh token\n- Endpoint \`/api/auth/me\`\n\n## Seguridad\n- Contraseñas hasheadas con bcrypt (10 rounds)\n- Tokens firmados con secreto en .env\n- Cookie httpOnly para refresh token`,
    status: 'done',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['backend', 'seguridad'],
    createdAt: daysAgo(25),
  },
  {
    title: 'Implementar tablero Kanban con columnas de estado',
    description: `## Entregado\nTablero visual con las 4 columnas del flujo de trabajo:\n- Por hacer\n- En progreso  \n- Review\n- Listo\n\nCada columna muestra el contador de tickets activos. Las tarjetas muestran título, prioridad, etiquetas y avatares de asignados.`,
    status: 'done',
    priority: 'high',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['frontend'],
    createdAt: daysAgo(20),
  },
  {
    title: 'Corregir bug: tokens de refresh no se invalidan al hacer logout',
    description: `## Bug reportado\nAl hacer logout, el refresh token permanecía válido en la BD, permitiendo generar nuevos access tokens.\n\n## Causa raíz\nEl endpoint \`POST /api/auth/logout\` eliminaba la cookie del cliente pero no borraba el registro en \`refresh_tokens\`.\n\n## Fix aplicado\nSe agrega query de DELETE en el handler de logout, comparando el hash del token recibido contra todos los tokens activos del usuario.\n\n## Verificación\nProbado manualmente con Postman: después de logout, \`POST /api/auth/refresh\` devuelve 401.`,
    status: 'done',
    priority: 'high',
    is_blocked: false,
    assignees: [admin.id],
    labels: ['bug', 'seguridad', 'backend'],
    createdAt: daysAgo(18),
  },
  {
    title: 'Agregar sistema de comentarios en tickets',
    description: `## Implementado\n- \`GET /api/tickets/:id/comments\`\n- \`POST /api/tickets/:id/comments\`\n- \`DELETE /api/comments/:id\` (soft delete)\n- Soporte de menciones con \`@usuario\`\n- Render de Markdown en el frontend\n\n## Permisos\n- Cualquier usuario autenticado puede comentar\n- Solo el autor o admin puede eliminar`,
    status: 'done',
    priority: 'medium',
    is_blocked: false,
    assignees: [juan.id],
    labels: ['frontend', 'backend'],
    createdAt: daysAgo(15),
  },
  {
    title: 'Integrar métricas de productividad del equipo',
    description: `## Métricas implementadas\n- Tickets cerrados por mes (gráfico de barras)\n- Distribución por estado (pie chart)\n- Carga de trabajo por miembro del equipo\n\n## Filtros disponibles\n- Rango de fechas\n- Estado\n- Asignado\n\n## Endpoint\n\`GET /api/metrics\` — requiere rol admin`,
    status: 'done',
    priority: 'medium',
    is_blocked: false,
    assignees: [admin.id, juan.id],
    labels: ['frontend', 'backend'],
    createdAt: daysAgo(11),
  },
];

console.log('\nInsertando tickets...');

for (const t of tickets) {
  const id = uuidv4();
  const createdAt = t.createdAt;
  const updatedAt = new Date(createdAt.getTime() + Math.random() * 3 * 86_400_000);

  await conn.execute(
    `INSERT INTO tickets (id, title, description, status, priority, is_blocked, created_by_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, t.title, t.description, t.status, t.priority, t.is_blocked ? 1 : 0, t.assignees[0], createdAt, updatedAt],
  );

  for (const userId of t.assignees) {
    await conn.execute(
      `INSERT INTO ticket_assignees (ticket_id, user_id) VALUES (?, ?)`,
      [id, userId],
    );
  }

  for (const labelName of t.labels) {
    const labelId = labelIds[labelName];
    if (labelId) {
      await conn.execute(
        `INSERT INTO ticket_labels (ticket_id, label_id) VALUES (?, ?)`,
        [id, labelId],
      );
    }
  }

  const bloqueado = t.is_blocked ? ' [BLOQUEADO]' : '';
  console.log(`  [${t.status.toUpperCase().padEnd(11)}] ${t.priority.toUpperCase().padEnd(6)} ${bloqueado} ${t.title}`);
}

await conn.end();
console.log('\nSeed de tickets completo.');
