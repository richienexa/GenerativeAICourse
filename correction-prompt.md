# Correction Prompt — Mini Jira Security Fixes

Eres un agente de seguridad especializado en Node.js/Express/TypeScript. Tu tarea es aplicar todas las correcciones de seguridad al proyecto Mini Jira en el directorio de trabajo, en el orden exacto indicado a continuación. **No modifiques ningún archivo que no esté listado. No refactorices. No agregues features.** Solo aplica los fixes de seguridad.

Lee cada archivo antes de editarlo. Aplica los cambios en orden de P1 → P2 → P3 → P4.

---

## FASE 1 — CRÍTICO (P1)

### Fix C-1: Rate limiting en /api/auth/login y /api/auth/refresh

**Instala el paquete** (agrégalo a `mini-jira-backend/package.json` y ejecuta `bun install`):
```
express-rate-limit@^7.4.0
```

**Edita** `mini-jira-backend/src/routes/auth.ts`:

1. Agrega este import al inicio del archivo (después de los imports existentes):
```typescript
import rateLimit from 'express-rate-limit';
```

2. Después de `const router = Router();` (línea 13), inserta estos dos limiters:
```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later' },
});
```

3. Aplica `loginLimiter` al route de login:
```typescript
// Cambiar línea 16 de:
router.post('/login', async (req: Request, res: Response): Promise<void> => {
// A:
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
```

4. Aplica `refreshLimiter` al route de refresh:
```typescript
// Cambiar línea 94 de:
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
// A:
router.post('/refresh', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
```

---

### Fix C-2: Validación de tipo de archivo en uploads + Content-Disposition

**Edita** `mini-jira-backend/src/middleware/upload.ts`:

Reemplaza el archivo completo con:
```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR ?? './uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.txt', '.zip', '.docx', '.xlsx',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB (reducido de 50 MB)
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});
```

**Edita** `mini-jira-backend/src/index.ts`:

Reemplaza la línea que sirve archivos estáticos:
```typescript
// Cambiar de:
app.use('/uploads', express.static(uploadDir));

// A (fuerza descarga en vez de renderizado en browser):
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadDir));
```

---

### Fix C-3: Control de autoría en PATCH y DELETE de tickets

**Edita** `mini-jira-backend/src/routes/tickets.ts`:

1. En `PATCH /api/tickets/:id` (alrededor de línea 248, después de verificar que el ticket existe), agrega la verificación de autoría:
```typescript
// Después de: if (!existing[0]) { res.status(404)... }
// Agrega:
const isOwner = existing[0].createdById === req.user!.sub;
const isAdmin = req.user!.role === 'admin';
if (!isOwner && !isAdmin) {
  res.status(403).json({ error: 'You do not have permission to modify this ticket' });
  return;
}
```

2. En `DELETE /api/tickets/:id` (alrededor de línea 298, después de verificar que el ticket existe), agrega la misma verificación:
```typescript
// Después de: if (!existing[0]) { res.status(404)... }
// Agrega:
const isOwner = existing[0].createdById === req.user!.sub;
const isAdmin = req.user!.role === 'admin';
if (!isOwner && !isAdmin) {
  res.status(403).json({ error: 'You do not have permission to delete this ticket' });
  return;
}
```

---

## FASE 2 — ALTO (P2)

### Fix A-1: Agregar Helmet (headers de seguridad HTTP)

**Instala el paquete:**
```
helmet@^8.0.0
```

**Edita** `mini-jira-backend/src/index.ts`:

1. Agrega el import después de los imports existentes:
```typescript
import helmet from 'helmet';
```

2. Agrega `app.use(helmet())` como el PRIMER middleware, antes de `app.use(cors(...))`:
```typescript
app.use(helmet());
app.use(cors({ ... }));
```

---

### Fix A-2: Verificar estado del usuario en el middleware auth

**Edita** `mini-jira-backend/src/middleware/auth.ts`:

Reemplaza la función `verifyToken` para que verifique el usuario activo en DB:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'member';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'JWT secret not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Verificar que el usuario sigue activo y obtener rol actualizado
    const userRows = await db
      .select({ id: users.id, role: users.role, archivedAt: users.archivedAt })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    const user = userRows[0];
    if (!user || user.archivedAt !== null) {
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }

    req.user = { ...payload, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

> **Nota:** Esto agrega una query DB por request. Si el rendimiento es crítico, considera un caché en memoria (Map + TTL de 1 minuto) como optimización posterior.

---

### Fix A-3: Rotar refresh tokens en cada uso

**Edita** `mini-jira-backend/src/routes/auth.ts`:

En el endpoint `POST /api/auth/refresh` (línea 94), después de validar el token y antes de retornar el accessToken, agrega la rotación:

```typescript
// Después de: const user = userRows[0]; if (!user || ...) { ... }
// Y antes de: res.json({ accessToken });

// Rotar el refresh token: eliminar el viejo, crear uno nuevo
const newRawRefreshToken = uuidv4();
const newTokenHash = createHash('sha256').update(newRawRefreshToken).digest('hex');
const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
await db.insert(refreshTokens).values({
  id: uuidv4(),
  userId: user.id,
  tokenHash: newTokenHash,
  expiresAt: newExpiresAt,
});

res.cookie('refreshToken', newRawRefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  expires: newExpiresAt,
  path: '/',
});

res.json({ accessToken });
```

También agrega en el endpoint de **login** (línea 57), antes de insertar el nuevo token, una limpieza de tokens expirados del mismo usuario para evitar acumulación:
```typescript
// Antes de: await db.insert(refreshTokens).values({ ... });
// Agregar:
await db.delete(refreshTokens).where(
  and(eq(refreshTokens.userId, user.id), lte(refreshTokens.expiresAt, new Date()))
);
// Importar: lte desde 'drizzle-orm'
```

---

### Fix A-4: Restringir POST y DELETE de labels a admin

**Edita** `mini-jira-backend/src/routes/labels.ts`:

1. Agrega el import del middleware:
```typescript
import { requireAdmin } from '../middleware/requireAdmin';
```

2. Modifica el route de POST:
```typescript
// De:
router.post('/', verifyToken, async (req: Request, res: Response) => {
// A:
router.post('/', verifyToken, requireAdmin, async (req: Request, res: Response) => {
```

3. Modifica el route de DELETE:
```typescript
// De:
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
// A:
router.delete('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
```

---

### Fix A-5: Corregir secretos JWT y eliminar variable muerta

**Edita** `mini-jira-backend/.env`:
```
JWT_SECRET=<genera un string aleatorio de 64+ caracteres con: openssl rand -hex 64>
```
Elimina la línea `JWT_REFRESH_SECRET` ya que nunca se usa en el código.

**Edita** `mini-jira-backend/.env.example`:
```
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_64_CHAR_HEX_STRING
```
Elimina la línea `JWT_REFRESH_SECRET` del example también.

---

## FASE 3 — MEDIO (P3)

### Fix M-1: Paginación en GET /api/tickets

**Edita** `mini-jira-backend/src/validators/tickets.ts`:

Agrega paginación al schema de query:
```typescript
export const ticketQuerySchema = z.object({
  // ... campos existentes ...
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
```

**Edita** `mini-jira-backend/src/routes/tickets.ts`:

En `GET /api/tickets`, después de construir `conditions`, aplica paginación:
```typescript
const { page, limit } = query;
const offset = (page - 1) * limit;

let ticketRows = await db
  .select()
  .from(tickets)
  .where(and(...conditions))
  .limit(limit)
  .offset(offset);
```

Actualiza la respuesta para incluir metadatos de paginación:
```typescript
res.json({ data: result, page, limit });
```

---

### Fix M-2: Política de contraseña mínima

**Edita** `mini-jira-backend/src/validators/auth.ts`:

```typescript
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

---

### Fix M-3: Cookie sameSite strict

**Edita** `mini-jira-backend/src/routes/auth.ts`, línea 68:

Cambia `sameSite: 'lax'` a `sameSite: 'strict'` en el cookie de login (el de refresh ya quedó `strict` con el Fix A-3).

---

### Fix M-4: Validación UUID en parámetros de ruta

**Crea** `mini-jira-backend/src/middleware/validateUuid.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!UUID_REGEX.test(req.params[paramName])) {
      res.status(400).json({ error: `Invalid ${paramName}: must be a valid UUID` });
      return;
    }
    next();
  };
}
```

Aplícalo en las rutas con parámetros `:id` y `:ticketId` en `tickets.ts`, `comments.ts`, `labels.ts`, y `users.ts`:
```typescript
import { validateParam } from '../middleware/validateUuid';

// Ejemplo en tickets.ts:
router.get('/:id', verifyToken, validateParam('id'), async (req, res) => { ... });
router.patch('/:id', verifyToken, validateParam('id'), async (req, res) => { ... });
router.delete('/:id', verifyToken, validateParam('id'), async (req, res) => { ... });
```

---

### Fix M-5: Límite explícito en body JSON y descripción de ticket

**Edita** `mini-jira-backend/src/index.ts`, línea 35:
```typescript
// De:
app.use(express.json());
// A:
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
```

**Edita** `mini-jira-backend/src/validators/tickets.ts`:
```typescript
description: z.string().max(10000).optional().nullable(),
```

---

## FASE 4 — BAJO (P4)

### Fix B-1: Ocultar X-Powered-By

Este queda cubierto automáticamente por Helmet (Fix A-1). Helmet desactiva `X-Powered-By` por defecto. No se requiere acción adicional.

---

### Fix B-2: Cookie segura en staging

**Edita** `mini-jira-backend/src/routes/auth.ts`:

Cambia la condición de `secure`:
```typescript
// De:
secure: process.env.NODE_ENV === 'production',
// A:
secure: process.env.NODE_ENV !== 'development',
```

Esto activa HTTPS para `production`, `staging`, `test`, y cualquier entorno que no sea explícitamente `development`.

---

### Fix B-3: Logging estructurado para eventos de seguridad

**Edita** `mini-jira-backend/src/routes/auth.ts`:

Agrega logging de intentos fallidos (sin exponer datos sensibles):
```typescript
// En el bloque de login fallido (línea 29 y 35):
if (!user || user.archivedAt !== null) {
  console.warn(JSON.stringify({ event: 'login_failed', reason: 'user_not_found', ip: req.ip, ts: new Date().toISOString() }));
  res.status(401).json({ error: 'Invalid email or password' });
  return;
}

if (!passwordValid) {
  console.warn(JSON.stringify({ event: 'login_failed', reason: 'invalid_password', userId: user.id, ip: req.ip, ts: new Date().toISOString() }));
  res.status(401).json({ error: 'Invalid email or password' });
  return;
}
```

**Edita** `mini-jira-backend/src/index.ts`, línea 72:
```typescript
// De:
console.error('Unhandled error:', err);
// A:
console.error(JSON.stringify({ event: 'unhandled_error', message: err instanceof Error ? err.message : String(err), ts: new Date().toISOString() }));
```

---

## Checklist de verificación post-correcciones

Después de aplicar todos los fixes, verifica:

- [ ] `POST /api/auth/login` con 11 intentos seguidos retorna 429 en el intento 11
- [ ] Subir un `.html` como attachment retorna 400
- [ ] Subir un `.svg` como attachment retorna 400
- [ ] Un archivo válido subido se descarga (no se renderiza) desde `/uploads/`
- [ ] `PATCH /api/tickets/:id` con token de `member` que NO es owner retorna 403
- [ ] `DELETE /api/tickets/:id` con token de `member` que NO es owner retorna 403
- [ ] `POST /api/labels` con token de `member` retorna 403
- [ ] `DELETE /api/labels/:id` con token de `member` retorna 403
- [ ] Login con contraseña de 7 caracteres retorna error de validación
- [ ] `GET /api/tickets` sin parámetros retorna máximo 50 tickets
- [ ] Headers de respuesta incluyen `X-Content-Type-Options: nosniff`
- [ ] Header `X-Powered-By` ya no aparece en las respuestas
- [ ] Después de usar el refresh token, el token anterior ya no es válido (rotación)
