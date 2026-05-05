# API Reference — Mini Jira

> **Fuente:** `mini-jira-backend/specs.md` (contrato base).
> Los endpoints marcados con ⚡ fueron añadidos en implementación posterior al contrato original y no aparecen en specs.md.
> No existe un archivo `api-contract.md` en el repositorio; este documento se generó a partir del contrato más cercano disponible.

- **Base URL:** `http://localhost:3001/api`
- **Auth:** `Authorization: Bearer {accessToken}` en todos los endpoints protegidos
- **Content-Type:** `application/json` salvo donde se indique `multipart/form-data`

---

## Tabla de endpoints

### Autenticación

| Método | Ruta | Auth | Body | Response | Status codes |
|--------|------|------|------|----------|--------------|
| `POST` | `/auth/login` | No | `email`, `password` | `{ accessToken, user }` + cookie `refreshToken` | 200, 400, 401, 429, 500 |
| `POST` | `/auth/refresh` | No (cookie) | — | `{ accessToken }` | 200, 401, 500 |
| `POST` | `/auth/logout` | Sí | — | vacío | 204, 401 |
| `GET` | `/auth/me` | Sí | — | `User` | 200, 401 |

### Tickets

| Método | Ruta | Auth | Body / Query | Response | Status codes |
|--------|------|------|--------------|----------|--------------|
| `GET` | `/tickets` | Sí | query: `status`, `priority`, `assignee_id`, `label`, `search`⚡, `from`, `to`, `page`, `limit` | `{ data: Ticket[], page, limit }` | 200, 400, 401 |
| `GET` | `/tickets/:id` | Sí | — | `Ticket` | 200, 400, 401, 404 |
| `POST` | `/tickets` | Sí | `title`, `description`, `priority`, `status`, `is_blocked`, `due_date`⚡, `assignee_ids`, `label_ids` | `Ticket` | 201, 400, 401 |
| `PATCH` | `/tickets/:id` | Sí | cualquier campo del POST (todos opcionales) + `due_date`⚡ | `Ticket` | 200, 400, 401, 403, 404 |
| `DELETE` | `/tickets/:id` | Sí | — | vacío | 204, 400, 401, 403, 404 |
| `GET`⚡ | `/tickets/:id/activity` | Sí | — | `ActivityLog[]` | 200, 400, 401, 404 |

### Comentarios

| Método | Ruta | Auth | Body | Response | Status codes |
|--------|------|------|------|----------|--------------|
| `GET` | `/tickets/:ticketId/comments` | Sí | — | `Comment[]` | 200, 401, 404 |
| `POST` | `/tickets/:ticketId/comments` | Sí | `body` (text) + `attachments` (multipart, opcional) | `Comment` | 201, 400, 401, 404 |
| `PATCH`⚡ | `/comments/:id` | Sí | `body` | `Comment` | 200, 400, 401, 403, 404 |
| `DELETE` | `/comments/:id` | Sí | — | vacío | 204, 401, 403, 404 |

### Usuarios

| Método | Ruta | Auth | Body | Response | Status codes |
|--------|------|------|------|----------|--------------|
| `GET` | `/users` | Sí | — | `User[]` | 200, 401 |
| `POST`⚡ | `/users` | Sí (admin) | `name`, `email`, `password`, `role` | `User` | 201, 400, 401, 403, 409 |
| `PATCH` | `/users/:id` | Sí | `role` (admin) ó `name`, `password` (self)⚡ | `User` | 200, 400, 401, 403, 404 |

### Etiquetas

| Método | Ruta | Auth | Body | Response | Status codes |
|--------|------|------|------|----------|--------------|
| `GET` | `/labels` | Sí | — | `Label[]` | 200, 401 |
| `POST` | `/labels` | Sí (admin) | `name` | `Label` | 201, 400, 401, 403 |
| `DELETE` | `/labels/:id` | Sí (admin) | — | vacío | 204, 400, 401, 403, 404 |

> **Nota:** specs.md indica que POST y DELETE de etiquetas son para "Todos", pero la implementación real requiere rol `admin`.

### Métricas

| Método | Ruta | Auth | Query | Response | Status codes |
|--------|------|------|-------|----------|--------------|
| `GET` | `/metrics` | Sí | `from`, `to`, `status`, `assignee_id` | `MetricsResponse` | 200, 400, 401 |
| `GET` | `/metrics/export` | Sí (header o `?access_token=`) | igual que `/metrics` | CSV file | 200, 400, 401 |

### SSE — Tiempo real ⚡

| Método | Ruta | Auth | Body | Response | Status codes |
|--------|------|------|------|----------|--------------|
| `GET`⚡ | `/sse/board` | Sí | — | `text/event-stream` | 200, 401 |

Eventos emitidos: `ticket:created`, `ticket:updated`, `ticket:deleted`.

---

## Sección "Autenticación"

### Flujo JWT completo

```
1. Login
   POST /api/auth/login  →  { accessToken }  +  Set-Cookie: refreshToken (HttpOnly)

2. Llamadas autenticadas
   GET /api/tickets  →  Authorization: Bearer {accessToken}
   (el access token dura 30 minutos)

3. Renovar access token (sin re-login)
   POST /api/auth/refresh  (envía cookie refreshToken automáticamente)
   →  { accessToken }  +  nueva cookie refreshToken  (rotación, dura 7 días)

4. Logout
   POST /api/auth/logout  →  204  (invalida refresh token en BD y borra cookie)
```

**Detalles de seguridad:**
- El `accessToken` viaja solo en el body de la respuesta y en el header `Authorization: Bearer`.
- El `refreshToken` es una cookie `HttpOnly; SameSite=Strict` — nunca expuesta a JavaScript.
- En BD se almacena únicamente el hash SHA-256 del refresh token (no el token en claro).
- Cada uso del refresh rota el token: el antiguo se invalida, se emite uno nuevo.
- El middleware `verifyToken` verifica la firma JWT **y** consulta la BD para comprobar que el usuario no fue archivado y que su rol no cambió desde que se emitió el token.

---

## Ejemplos cURL (endpoints P0)

> Reemplaza `{token}` por el `accessToken` obtenido en el login.

### Login

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexabanco.com","password":"admin1234"}'
```

### Obtener usuario actual

```bash
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer {token}"
```

### Renovar access token

```bash
# El navegador envía la cookie automáticamente; en curl usa --cookie
curl -s -X POST http://localhost:3001/api/auth/refresh \
  --cookie "refreshToken={rawRefreshToken}"
```

### Listar tickets (con filtros)

```bash
curl -s "http://localhost:3001/api/tickets?status=in_progress&priority=high&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

### Buscar tickets por texto ⚡

```bash
curl -s "http://localhost:3001/api/tickets?search=autenticación" \
  -H "Authorization: Bearer {token}"
```

### Crear ticket

```bash
curl -s -X POST http://localhost:3001/api/tickets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implementar OAuth 2.0",
    "description": "Integrar Google Workspace como proveedor.",
    "priority": "high",
    "status": "todo",
    "is_blocked": false,
    "due_date": "2026-06-30T00:00:00.000Z",
    "assignee_ids": ["a1000000-0000-0000-0000-000000000001"],
    "label_ids": []
  }'
```

### Actualizar estado de un ticket

```bash
curl -s -X PATCH http://localhost:3001/api/tickets/{ticketId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Archivar ticket

```bash
curl -s -X DELETE http://localhost:3001/api/tickets/{ticketId} \
  -H "Authorization: Bearer {token}"
```

### Listar comentarios de un ticket

```bash
curl -s http://localhost:3001/api/tickets/{ticketId}/comments \
  -H "Authorization: Bearer {token}"
```

### Crear comentario (texto plano)

```bash
curl -s -X POST http://localhost:3001/api/tickets/{ticketId}/comments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"body": "Revisé el PR, LGTM."}'
```

### Crear comentario con adjunto (multipart)

```bash
curl -s -X POST http://localhost:3001/api/tickets/{ticketId}/comments \
  -H "Authorization: Bearer {token}" \
  -F "body=Adjunto el diagrama" \
  -F "attachments=@/ruta/al/archivo.png"
```

### Editar comentario ⚡

```bash
curl -s -X PATCH http://localhost:3001/api/comments/{commentId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"body": "Texto corregido del comentario."}'
```

### Ver log de actividad de un ticket ⚡

```bash
curl -s http://localhost:3001/api/tickets/{ticketId}/activity \
  -H "Authorization: Bearer {token}"
```

### Listar usuarios

```bash
curl -s http://localhost:3001/api/users \
  -H "Authorization: Bearer {token}"
```

### Crear usuario (admin) ⚡

```bash
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María López",
    "email": "mlopez@nexabanco.com",
    "password": "segura1234",
    "role": "member"
  }'
```

### Actualizar perfil propio ⚡

```bash
curl -s -X PATCH http://localhost:3001/api/users/{myUserId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Nuevo Nombre", "password": "nuevapass123"}'
```

### Obtener métricas

```bash
curl -s "http://localhost:3001/api/metrics?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer {token}"
```

### Exportar métricas a CSV

```bash
# Opción 1 — header
curl -s "http://localhost:3001/api/metrics/export?from=2026-01-01" \
  -H "Authorization: Bearer {token}" \
  -o metrics.csv

# Opción 2 — query param (útil para descarga directa desde el navegador)
curl -s "http://localhost:3001/api/metrics/export?access_token={token}&from=2026-01-01" \
  -o metrics.csv
```

### Conectar al stream SSE ⚡

```bash
curl -s -N http://localhost:3001/api/sse/board \
  -H "Authorization: Bearer {token}"
# Mantiene la conexión abierta y emite eventos ticket:created / ticket:updated / ticket:deleted
```

---

## Modelos de respuesta

### User
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "role": "admin | member",
  "created_at": "ISO date",
  "updated_at": "ISO date"
}
```

### Ticket
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "todo | in_progress | review | done",
  "priority": "low | medium | high",
  "is_blocked": false,
  "due_date": "ISO date | null",
  "created_by": "uuid",
  "archived_at": "ISO date | null",
  "created_at": "ISO date",
  "updated_at": "ISO date",
  "assignees": [User],
  "labels": ["string"]
}
```

### Comment
```json
{
  "id": "uuid",
  "ticket_id": "uuid",
  "author": { "id", "name", "email", "role" },
  "body": "string",
  "edited_at": "ISO date | null",
  "archived_at": "ISO date | null",
  "created_at": "ISO date",
  "updated_at": "ISO date",
  "attachments": [Attachment]
}
```

### ActivityLog ⚡
```json
{
  "id": "uuid",
  "action": "created | updated",
  "field": "status | priority | title | null",
  "oldValue": "string | null",
  "newValue": "string | null",
  "createdAt": "ISO date",
  "user": { "id", "name", "email" }
}
```

### MetricsResponse
```json
{
  "tickets_closed_by_month": [{ "month": "YYYY-MM", "count": 0 }],
  "tickets_by_status": { "todo": 0, "in_progress": 0, "review": 0, "done": 0 },
  "tickets_by_member": [{ "user": { "id", "name" }, "active_count": 0 }]
}
```

---

## Códigos de respuesta globales

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Recurso creado |
| 204 | Sin contenido (DELETE / logout) |
| 400 | Error de validación Zod (body `{ error, details }`) |
| 401 | Token ausente, inválido o expirado |
| 403 | Sin permisos (rol insuficiente o no es el autor) |
| 404 | Recurso no encontrado o archivado |
| 409 | Conflicto (ej. email duplicado en POST /users) |
| 429 | Rate limit excedido (login: 10 req/15 min en producción) |
| 500 | Error interno del servidor |
