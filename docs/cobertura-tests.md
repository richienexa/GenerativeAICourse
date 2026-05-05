# Cobertura de Tests — Mini Jira

> **Fuente:** `src/tests/auth.test.ts` (6 tests) y `src/tests/tickets.test.ts` (9 tests).
> Los tests son de integración: llaman al servidor real sobre MySQL. Se ejecutan con `NODE_ENV=test bun test src/tests`.
> **Nota:** `backlog.md` no existe en el repositorio; la tabla se ha derivado de `specs.md` y de los 10 endpoints documentados en `api-reference.md`.

---

## 1. Tabla de cobertura por historia / endpoint

| Historia / Endpoint | Descripción | Estado |
|---|---|---|
| `POST /auth/login` — credenciales válidas | Login exitoso, devuelve `accessToken` + cookie | ✅ |
| `POST /auth/login` — body vacío | Validación Zod → 400 | ✅ |
| `POST /auth/login` — contraseña incorrecta | → 401 | ✅ |
| `POST /auth/login` — usuario archivado | → 401 igual que "not found" | ❌ |
| `POST /auth/refresh` — rotación de token | Emite nuevo access + rota cookie | ❌ |
| `POST /auth/refresh` — token inexistente/expirado | → 401 | ❌ |
| `POST /auth/logout` | Invalida token en BD, borra cookie → 204 | ❌ |
| `GET /auth/me` — sin token | → 401 | ✅ |
| `GET /auth/me` — con token | Devuelve usuario autenticado | ✅ |
| `GET /tickets` — sin autenticación | → 401 | ✅ |
| `GET /tickets` — paginación | Devuelve `{ data, page, limit }` | ✅ |
| `GET /tickets` — filtro `search` (sin match) | Devuelve array vacío | ✅ |
| `GET /tickets` — filtros `status`, `priority`, `assignee_id`, `label` | Devuelven subconjunto correcto | ❌ |
| `GET /tickets` — filtro rango de fechas (`from`/`to`) | Devuelve tickets en rango | ❌ |
| `GET /tickets/:id` — ticket existente | Devuelve ticket con assignees y labels | ❌ |
| `GET /tickets/:id` — UUID inválido | → 400 | ⚠️ (cubierto indirectamente en PATCH) |
| `GET /tickets/:id` — ticket archivado | → 404 | ❌ |
| `POST /tickets` — creación completa | Título, prioridad, assignees | ✅ |
| `POST /tickets` — sin título | → 400 | ✅ |
| `POST /tickets` — con `due_date` | Almacena fecha límite correctamente | ❌ |
| `POST /tickets` — con labels | Asocia etiquetas correctamente | ❌ |
| `PATCH /tickets/:id` — cambio de status | → 200 con nuevo status | ✅ |
| `PATCH /tickets/:id` — UUID inválido | → 400 | ✅ |
| `PATCH /tickets/:id` — sin permisos (miembro no asignado) | → 403 | ❌ |
| `PATCH /tickets/:id` — ticket archivado/inexistente | → 404 | ❌ |
| `PATCH /tickets/:id` — marcar `is_blocked` | Badge bloqueado en respuesta | ❌ |
| `DELETE /tickets/:id` — propietario/admin | Soft-delete → 204 | ✅ |
| `DELETE /tickets/:id` — sin permisos | → 403 | ❌ |
| `GET /tickets/:id/activity` — tras create + update | Array con eventos `created` + `updated` | ✅ |
| `GET /tickets/:id/activity` — ticket inexistente | → 404 | ❌ |
| `GET /tickets/:ticketId/comments` | Lista comentarios con autor y attachments | ❌ |
| `POST /tickets/:ticketId/comments` — texto plano | Crea comentario, devuelve 201 | ❌ |
| `POST /tickets/:ticketId/comments` — con adjunto | Sube archivo, asocia attachment | ❌ |
| `PATCH /comments/:id` — autor edita su comentario | → 200, `edited_at` poblado | ❌ |
| `PATCH /comments/:id` — otro usuario | → 403 | ❌ |
| `DELETE /comments/:id` — autor o admin | Soft-delete → 204 | ❌ |
| `GET /users` — lista activa | Devuelve usuarios no archivados | ❌ |
| `POST /users` — admin crea usuario | → 201 con nuevo usuario | ❌ |
| `POST /users` — email duplicado | → 409 | ❌ |
| `POST /users` — sin rol admin | → 403 | ❌ |
| `PATCH /users/:id` — self: nombre/contraseña | → 200 con datos actualizados | ❌ |
| `PATCH /users/:id` — admin: cambio de rol | → 200 | ❌ |
| `GET /labels` | Lista etiquetas activas | ❌ |
| `POST /labels` — admin | → 201 | ❌ |
| `DELETE /labels/:id` — admin | → 204 | ❌ |
| `GET /metrics` | Devuelve estructura `MetricsResponse` | ❌ |
| `GET /metrics/export` | Descarga CSV | ❌ |
| `GET /sse/board` | Abre stream SSE, emite heartbeat | ❌ |

**Resumen:** 9 de 48 casos cubiertos (**~19 %**). 1 parcialmente cubierto.

---

## 2. Edge cases del contrato sin test

Los siguientes escenarios están especificados en el contrato (o se derivan de la implementación) pero no tienen ningún test:

| Edge case | Endpoint afectado | Riesgo si falla |
|---|---|---|
| Usuario archivado puede hacer login | `POST /auth/login` | Alto — permite acceso a cuentas desactivadas |
| Refresh token reutilizado (replay attack) | `POST /auth/refresh` | Crítico — compromete la seguridad de sesiones |
| Ticket archivado aún accesible con `:id` directo | `GET /tickets/:id` | Medio — leak de datos ya borrados |
| Miembro no asignado intenta editar ticket | `PATCH /tickets/:id` | Alto — escala de privilegios |
| Admin puede editar cualquier ticket | `PATCH /tickets/:id` | Alto — garantía de rol quebrada si falla |
| Edición de comentario ajeno | `PATCH /comments/:id` | Alto — integridad de datos |
| `POST /users` con email ya existente | `POST /users` | Medio — duplicado silencioso si 409 no se lanza |
| `GET /metrics` con rango vacío | `GET /metrics` | Bajo — podría arrojar NaN o null en respuesta |
| SSE desconexión abrupta del cliente | `GET /sse/board` | Bajo — memory leak potencial si el intervalo no se limpia |
| Paginación con `page=0` o `limit=0` | `GET /tickets` | Medio — comportamiento indefinido, posible error DB |
| UUID válido pero inexistente en cualquier ruta `:id` | varios | Medio — debe ser 404, no 500 |

---

## 3. Deuda técnica de testing (top 3 por criticidad)

### 1. Autenticación y gestión de sesiones — **CRÍTICO**

`POST /auth/refresh` y `POST /auth/logout` no tienen ningún test. Son el núcleo del modelo de seguridad: token rotation, invalidación en BD, y protección contra replay attacks. Un bug aquí puede dejar sesiones activas tras logout o permitir que un token robado se reutilice indefinidamente. Todo el flujo de renovación silenciosa del frontend (interceptor axios/fetch) también queda sin validación end-to-end.

**Cobertura mínima recomendada:** refresh emite nuevo token y rota cookie; token antiguo ya no funciona; logout elimina la entrada en `refresh_tokens`; usuario archivado no puede refrescar.

---

### 2. Control de acceso (403 Forbidden) — **ALTO**

Ningún test verifica que el middleware de permisos rechace correctamente a usuarios sin privilegios. Esto afecta a `PATCH /tickets/:id` (miembro no asignado), `DELETE /tickets/:id` (no propietario/no admin), `PATCH /comments/:id` (no autor), `POST /users` (no admin), `POST|DELETE /labels` (no admin). Si una refactorización rompe la lógica de autorización, los tests actuales no lo detectarán.

**Cobertura mínima recomendada:** al menos un test 403 por cada tipo de recurso protegido (tickets, comentarios, usuarios, etiquetas).

---

### 3. Flujo de comentarios — **ALTO**

`GET`, `POST`, `PATCH` y `DELETE` de comentarios tienen 0 % de cobertura. Los comentarios son el principal vector de uso colaborativo de la aplicación y aglutinan lógica compleja: subida de archivos (multipart), soft-delete, edición con `edited_at`, y restricción de autor. Un error en cualquiera de estos puntos sería visible a todos los usuarios inmediatamente pero no sería detectado por la suite actual.

**Cobertura mínima recomendada:** crear comentario → listar → editar (verificar `edited_at`) → eliminar → verificar que no aparece en listado.
