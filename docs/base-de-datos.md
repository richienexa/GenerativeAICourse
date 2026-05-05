# Base de datos — Mini Jira

> **Fuente:** `mini-jira-backend/src/db/schema.ts`.
> Motor: **MySQL 8**. ORM: **Drizzle ORM** (declarativo, type-safe). Todos los IDs son UUID v4 (`varchar(36)`).

---

## 1. Diagrama ERD

```mermaid
erDiagram
    users {
        varchar(36)  id              PK
        varchar(255) name            NOT_NULL
        varchar(255) email           NOT_NULL_UNIQUE
        varchar(255) password_hash   NOT_NULL
        enum         role            "admin|member DEFAULT member"
        datetime     archived_at
        datetime     created_at      DEFAULT_CURRENT_TIMESTAMP
        datetime     updated_at      DEFAULT_CURRENT_TIMESTAMP
    }

    refresh_tokens {
        varchar(36)  id          PK
        varchar(36)  user_id     FK_NOT_NULL
        varchar(255) token_hash  NOT_NULL_UNIQUE
        datetime     expires_at  NOT_NULL
        datetime     created_at  DEFAULT_CURRENT_TIMESTAMP
    }

    tickets {
        varchar(36)  id           PK
        varchar(120) title        NOT_NULL
        text         description
        enum         status       "todo|in_progress|review|done DEFAULT todo"
        enum         priority     "low|medium|high DEFAULT medium"
        boolean      is_blocked   "DEFAULT false"
        datetime     due_date
        varchar(36)  created_by_id FK
        datetime     archived_at
        datetime     created_at   DEFAULT_CURRENT_TIMESTAMP
        datetime     updated_at   DEFAULT_CURRENT_TIMESTAMP
    }

    ticket_assignees {
        varchar(36) ticket_id  PK_FK
        varchar(36) user_id    PK_FK
    }

    labels {
        varchar(36)  id             PK
        varchar(100) name           NOT_NULL_UNIQUE
        varchar(36)  created_by_id  FK
        datetime     archived_at
        datetime     created_at     DEFAULT_CURRENT_TIMESTAMP
    }

    ticket_labels {
        varchar(36) ticket_id  PK_FK
        varchar(36) label_id   PK_FK
    }

    comments {
        varchar(36) id         PK
        varchar(36) ticket_id  FK_NOT_NULL
        varchar(36) author_id  FK
        text        body       NOT_NULL
        datetime    edited_at
        datetime    archived_at
        datetime    created_at DEFAULT_CURRENT_TIMESTAMP
        datetime    updated_at DEFAULT_CURRENT_TIMESTAMP
    }

    attachments {
        varchar(36)  id            PK
        varchar(36)  comment_id    FK_NOT_NULL
        varchar(255) filename      NOT_NULL
        varchar(255) original_name NOT_NULL
        varchar(100) mime_type     NOT_NULL
        int_unsigned size          NOT_NULL
        varchar(500) path          NOT_NULL
        datetime     archived_at
        datetime     created_at    DEFAULT_CURRENT_TIMESTAMP
    }

    activity_logs {
        varchar(36) id         PK
        varchar(36) ticket_id  FK_NOT_NULL
        varchar(36) user_id    FK
        varchar(50) action     NOT_NULL
        varchar(100) field
        text        old_value
        text        new_value
        datetime    created_at DEFAULT_CURRENT_TIMESTAMP
    }

    users         ||--o{ refresh_tokens   : "tiene"
    users         ||--o{ tickets          : "crea"
    users         ||--o{ ticket_assignees : "asignado a"
    tickets       ||--o{ ticket_assignees : "tiene"
    tickets       ||--o{ ticket_labels    : "tiene"
    labels        ||--o{ ticket_labels    : "usada en"
    tickets       ||--o{ comments         : "tiene"
    comments      ||--o{ attachments      : "adjunta"
    tickets       ||--o{ activity_logs    : "registra"
    users         ||--o{ activity_logs    : "realiza"
    users         ||--o{ comments         : "escribe"
    users         ||--o{ labels           : "crea"
```

---

## 2. Tablas y columnas clave

### `users`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | UUID v4 generado en aplicación |
| `name` | `varchar(255)` | NOT NULL | |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | Identificador de login |
| `password_hash` | `varchar(255)` | NOT NULL | bcrypt, cost 10 |
| `role` | `enum('admin','member')` | NOT NULL, DEFAULT 'member' | Control de acceso a rutas admin |
| `archived_at` | `datetime` | NULL | Soft-delete; el login rechaza usuarios con `archived_at IS NOT NULL` |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `refresh_tokens`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `user_id` | `varchar(36)` | NOT NULL, FK → `users.id` CASCADE DELETE | |
| `token_hash` | `varchar(255)` | NOT NULL, UNIQUE | SHA-256 del UUID raw; nunca se guarda el token en claro |
| `expires_at` | `datetime` | NOT NULL | 7 días desde emisión; se limpia en login siguiente |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `tickets`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `title` | `varchar(120)` | NOT NULL | Límite de 120 chars también validado en Zod |
| `description` | `text` | NULL | |
| `status` | `enum('todo','in_progress','review','done')` | NOT NULL, DEFAULT 'todo' | |
| `priority` | `enum('low','medium','high')` | NOT NULL, DEFAULT 'medium' | |
| `is_blocked` | `boolean` | NOT NULL, DEFAULT false | Badge visual; no bloquea transiciones de estado |
| `due_date` | `datetime` | NULL | Fecha límite; el frontend muestra badge rojo si `due_date < now && status != 'done'` |
| `created_by_id` | `varchar(36)` | FK → `users.id`, NULL | NULL si el usuario creador fue archivado |
| `archived_at` | `datetime` | NULL | Soft-delete; excluido de `GET /tickets` con `archived_at IS NULL` |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `ticket_assignees`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `ticket_id` | `varchar(36)` | PK compuesta, FK → `tickets.id` CASCADE | |
| `user_id` | `varchar(36)` | PK compuesta, FK → `users.id` CASCADE | |

Tabla de unión N:M entre `tickets` y `users`. No tiene columnas adicionales; la asignación es un hecho binario sin metadatos.

---

### `labels`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `name` | `varchar(100)` | NOT NULL, UNIQUE | |
| `created_by_id` | `varchar(36)` | FK → `users.id`, NULL | |
| `archived_at` | `datetime` | NULL | Soft-delete |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `ticket_labels`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `ticket_id` | `varchar(36)` | PK compuesta, FK → `tickets.id` CASCADE | |
| `label_id` | `varchar(36)` | PK compuesta, FK → `labels.id` CASCADE | |

---

### `comments`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `ticket_id` | `varchar(36)` | NOT NULL, FK → `tickets.id` CASCADE | |
| `author_id` | `varchar(36)` | FK → `users.id`, NULL | NULL si el autor fue archivado |
| `body` | `text` | NOT NULL | |
| `edited_at` | `datetime` | NULL | Poblado en `PATCH /comments/:id`; indica al frontend mostrar "(editado)" |
| `archived_at` | `datetime` | NULL | Soft-delete |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| `updated_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `attachments`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `comment_id` | `varchar(36)` | NOT NULL, FK → `comments.id` CASCADE | |
| `filename` | `varchar(255)` | NOT NULL | Nombre en disco (sanitizado) |
| `original_name` | `varchar(255)` | NOT NULL | Nombre original del upload |
| `mime_type` | `varchar(100)` | NOT NULL | |
| `size` | `int unsigned` | NOT NULL | Bytes |
| `path` | `varchar(500)` | NOT NULL | Ruta en el sistema de archivos del servidor |
| `archived_at` | `datetime` | NULL | |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

### `activity_logs`

| Columna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `varchar(36)` | PK | |
| `ticket_id` | `varchar(36)` | NOT NULL, FK → `tickets.id` CASCADE | |
| `user_id` | `varchar(36)` | FK → `users.id`, NULL | NULL si el usuario fue archivado |
| `action` | `varchar(50)` | NOT NULL | `'created'` o `'updated'` |
| `field` | `varchar(100)` | NULL | Nombre de campo modificado (p. ej. `'status'`); NULL en `action='created'` |
| `old_value` | `text` | NULL | Valor anterior; NULL en creación |
| `new_value` | `text` | NULL | Valor nuevo |
| `created_at` | `datetime` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Sin `updated_at` — registro inmutable |

---

## 3. Decisiones de diseño

### Soft delete universal (`archived_at`)

Todas las entidades del usuario (`users`, `tickets`, `labels`, `comments`, `attachments`) usan un campo `archived_at datetime NULL` en lugar de `DELETE` físico. Esto preserva la integridad referencial sin necesitar `ON DELETE SET NULL` cascading y permite auditar datos históricos. La aplicación filtra siempre con `archived_at IS NULL` en las consultas activas.

La única excepción son `refresh_tokens` y `activity_logs`, que se borran de forma física: los tokens por rotación/expiración (no tiene sentido auditarlos), y los logs de actividad son inmutables por diseño (sin `archived_at`, sin `updated_at`).

---

### Tokens de refresco hasheados (no en claro)

La columna `token_hash` almacena únicamente el SHA-256 del UUID raw. El token real viaja solo en la cookie HttpOnly y nunca persiste en BD. Si la base de datos se ve comprometida, los hashes expuestos no son directamente utilizables para suplantar sesiones (el token necesita ser adivinado, no invertido desde el hash).

---

### Sin Pessimistic Lock — Last-Write-Wins

No hay columna `locked_by` ni mecanismo de bloqueo a nivel de fila. Dos usuarios que editen el mismo ticket simultáneamente: el último `PATCH` sobreescribe. Este es el diseño deliberado documentado en `specs.md`: prioridad en la simplicidad de implementación sobre consistencia estricta. El historial de `activity_logs` actúa como red de seguridad para detectar sobreescrituras.

---

### PKs UUID v4 generadas en aplicación

Las claves primarias son UUID v4 generados con `uuidv4()` en la capa de aplicación (no `AUTO_INCREMENT`). Esto permite construir el ID antes de insertar (útil para relaciones y SSE), facilita la migración entre instancias, y evita IDs secuenciales predecibles en la URL.

---

### Claves foráneas nullable para usuarios archivados

`tickets.created_by_id`, `comments.author_id`, `labels.created_by_id` y `activity_logs.user_id` admiten NULL. Esto evita que archivar un usuario rompa en cascada todos sus tickets y comentarios. Los registros huérfanos simplemente muestran "usuario eliminado" en el frontend.

---

### Tabla de unión sin columnas extra (N:M)

`ticket_assignees` y `ticket_labels` son tablas de unión puras con PK compuesta y sin columnas adicionales (sin `assigned_at`, sin `order`). El criterio fue YAGNI: la UI actual no necesita ordenar asignados ni fechar la asignación. Si se necesitara, se añadiría como una migración incremental.
