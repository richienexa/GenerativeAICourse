# Mini Jira — Backend Specs

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js |
| Framework | Express |
| ORM | Drizzle ORM |
| Base de datos | MySQL |
| Validación | Zod |
| Autenticación | JWT (access + refresh tokens) |
| Archivos | Disco local (multer) |

---

## Configuración general

- **Puerto:** 3000
- **Prefijo de rutas:** `/api`
- **Access token:** expira en 30 minutos
- **Refresh token:** expira en 7 días
- **Archivos adjuntos:** almacenados en disco local, servidos como estáticos

---

## Autenticación

- Usuario y contraseña (email + password)
- Contraseñas hasheadas con bcrypt
- El access token se retorna en el body de la respuesta
- El refresh token se retorna en una cookie `HttpOnly`
- Todos los endpoints (excepto login) requieren Bearer token en el header `Authorization`

---

## Reglas de negocio

| Regla | Detalle |
|-------|---------|
| Roles | `admin` y `member` |
| Borrado | Soft delete via `archived_at` en todas las tablas |
| Asignados | Un ticket debe tener al menos 1 asignado |
| Etiquetas | Predefinidas en tabla, cualquier usuario autenticado puede crearlas |
| Adjuntos | Solo en comentarios; se guardan en disco local |
| Métricas | Calculadas en tiempo real con queries SQL |
| Conflictos | Last-write-wins (sin optimistic locking) |
| Admin | Solo admins pueden cambiar el rol de un usuario |

---

## Endpoints

### Auth

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/api/auth/login` | Login con email y password | No |
| POST | `/api/auth/refresh` | Genera nuevo access token con refresh token (cookie) | No |
| POST | `/api/auth/logout` | Invalida el refresh token | Sí |
| GET | `/api/auth/me` | Retorna el usuario autenticado | Sí |

**POST /api/auth/login — Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Respuesta 200:**
```json
{
  "accessToken": "string",
  "user": { "id", "name", "email", "role" }
}
```
Setea cookie `HttpOnly` con el refresh token.

---

### Tickets

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/tickets` | Listar tickets (con filtros) | Todos |
| GET | `/api/tickets/:id` | Obtener ticket por ID | Todos |
| POST | `/api/tickets` | Crear ticket | Todos |
| PATCH | `/api/tickets/:id` | Actualizar ticket | Todos |
| DELETE | `/api/tickets/:id` | Archivar ticket | Todos |

**Query params GET /api/tickets:**
- `status` — `todo` \| `in_progress` \| `review` \| `done` (múltiple: `?status=todo&status=done`)
- `priority` — `low` \| `medium` \| `high`
- `assignee_id` — UUID
- `label` — string (nombre de etiqueta)
- `from` — fecha ISO (`YYYY-MM-DD`)
- `to` — fecha ISO (`YYYY-MM-DD`)

Solo retorna tickets no archivados por defecto.

**POST /api/tickets — Body:**
```json
{
  "title": "string (1-120 chars)",
  "description": "string (opcional)",
  "priority": "low | medium | high",
  "status": "todo | in_progress | review | done",
  "is_blocked": "boolean",
  "assignee_ids": ["uuid"],
  "label_ids": ["uuid"]
}
```

**PATCH /api/tickets/:id — Body:** (todos los campos opcionales)
```json
{
  "title": "string",
  "description": "string",
  "priority": "low | medium | high",
  "status": "todo | in_progress | review | done",
  "is_blocked": "boolean",
  "assignee_ids": ["uuid"],
  "label_ids": ["uuid"]
}
```

---

### Comentarios

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/tickets/:id/comments` | Listar comentarios del ticket | Todos |
| POST | `/api/tickets/:id/comments` | Crear comentario (con adjuntos opcionales) | Todos |
| DELETE | `/api/comments/:id` | Archivar comentario | Autor o admin |

**POST /api/tickets/:id/comments — Body (multipart/form-data):**
- `body` — string (texto/markdown, requerido)
- `attachments` — archivos (opcionales, múltiples)

**Respuesta comentario:**
```json
{
  "id": "uuid",
  "ticket_id": "uuid",
  "author": { "id", "name", "email" },
  "body": "string",
  "attachments": [{ "id", "filename", "original_name", "url", "mime_type", "size" }],
  "archived_at": null,
  "created_at": "ISO date"
}
```

---

### Usuarios

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/users` | Listar usuarios activos | Todos |
| PATCH | `/api/users/:id` | Actualizar rol del usuario | Solo admin |

**PATCH /api/users/:id — Body:**
```json
{
  "role": "admin | member"
}
```

---

### Etiquetas

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/labels` | Listar etiquetas activas | Todos |
| POST | `/api/labels` | Crear etiqueta | Todos |
| DELETE | `/api/labels/:id` | Archivar etiqueta | Todos |

**POST /api/labels — Body:**
```json
{
  "name": "string (1-100 chars)"
}
```

---

### Métricas

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/metrics` | Dashboard de métricas | Todos |

**Query params:**
- `from` — fecha ISO
- `to` — fecha ISO
- `status` — `todo` \| `in_progress` \| `review` \| `done`
- `assignee_id` — UUID

**Respuesta 200:**
```json
{
  "tickets_closed_by_month": [{ "month": "YYYY-MM", "count": 0 }],
  "tickets_by_status": { "todo": 0, "in_progress": 0, "review": 0, "done": 0 },
  "tickets_by_member": [{ "user": { "id", "name" }, "active_count": 0 }]
}
```

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 204 | Sin contenido (DELETE) |
| 400 | Validación fallida |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 500 | Error interno |

---

## Variables de entorno (.env)

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=mini_jira
JWT_SECRET=
JWT_REFRESH_SECRET=
UPLOAD_DIR=./uploads
CLIENT_URL=http://localhost:5173
```
