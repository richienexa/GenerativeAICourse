# Security Audit Report — Mini Jira Backend
**Auditor:** OWASP Security Specialist (Claude)
**Fecha:** 2026-05-04
**Alcance:** `mini-jira-backend/src/routes/`, `mini-jira-backend/src/middleware/`, `mini-jira-backend/src/validators/`, `mini-jira-backend/src/index.ts`, `mini-jira-frontend/src/api/client.ts`
**Metodología:** OWASP Top 10 (2021)

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICO   | 3        |
| ALTO      | 5        |
| MEDIO     | 5        |
| BAJO      | 3        |
| **Total** | **16**   |

---

## CRÍTICO

---

### [C-1] Sin rate limiting en el endpoint de login — Fuerza Bruta ilimitada
**OWASP:** A07:2021 – Identification and Authentication Failures
**Archivo:** `mini-jira-backend/src/routes/auth.ts`, línea 16

**Evidencia:**
```typescript
// auth.ts:16
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  // No hay ningún mecanismo de throttling, bloqueo de IP ni límite de intentos
  const data = loginSchema.parse(req.body);
  ...
  const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
```

**Impacto real:**
Un atacante puede enviar miles de intentos por segundo contra cualquier email conocido. Con las credenciales del seed (`admin@nexabanco.com`) ya expuestas en el repositorio, el único obstáculo es el hash bcrypt (cost 10 ≈ ~100ms/intento). En hardware moderno con paralelismo se pueden probar diccionarios completos de contraseñas sin ninguna penalización. La cuenta de admin puede ser comprometida completamente sin dejar trazas de bloqueo.

---

### [C-2] Sin validación de tipo de archivo en uploads — Stored XSS / RCE potencial
**OWASP:** A03:2021 – Injection / A04:2021 – Insecure Design
**Archivos:** `mini-jira-backend/src/middleware/upload.ts:24`, `mini-jira-backend/src/index.ts:40`

**Evidencia:**
```typescript
// upload.ts:24-29 — sin fileFilter, sin whitelist de MIME types
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  // ⚠️ Sin fileFilter: acepta cualquier extensión y MIME type
});

// index.ts:40 — los archivos se sirven con su MIME type nativo
app.use('/uploads', express.static(uploadDir));
```

**Impacto real:**
Cualquier usuario autenticado puede subir un archivo `.html` o `.svg` con JavaScript embebido. Cuando otro usuario accede a la URL `/uploads/<uuid>.svg`, el navegador lo ejecuta en el mismo origen de la app, otorgando acceso total al DOM, cookies de sesión accesibles por JS, y la capacidad de hacer requests autenticados a la API. También permite subir `.exe`, `.sh` u otros payloads para ataques a usuarios que descarguen los archivos.

---

### [C-3] Broken Access Control — cualquier usuario modifica o elimina tickets ajenos
**OWASP:** A01:2021 – Broken Access Control
**Archivos:** `mini-jira-backend/src/routes/tickets.ts:235`, `tickets.ts:290`

**Evidencia:**
```typescript
// tickets.ts:235 — PATCH sin verificar autoría
router.patch('/:id', verifyToken, async (req: Request, res: Response) => {
  // Solo verifica que el ticket existe; no verifica createdById ni assignees
  const existing = await db.select().from(tickets)
    .where(and(eq(tickets.id, id), isNull(tickets.archivedAt))).limit(1);
  // Cualquier usuario autenticado puede cambiar título, status, asignados, etc.
});

// tickets.ts:290 — DELETE sin verificar autoría
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  // Cualquier usuario puede archivar (soft-delete) cualquier ticket
});
```

**Impacto real:**
Un usuario con rol `member` puede modificar todos los tickets de la aplicación, reasignarlos, cambiar su estado, o eliminarlos. En un equipo real esto permite sabotaje deliberado o accidental sin restricción. También puede manipular `is_blocked` y `priority` en tickets de otros usuarios.

---

## ALTO

---

### [A-1] Sin headers de seguridad HTTP (falta Helmet)
**OWASP:** A05:2021 – Security Misconfiguration
**Archivo:** `mini-jira-backend/src/index.ts:17-40`

**Evidencia:**
```typescript
// index.ts — no hay helmet ni headers de seguridad manuales
const app = express();
app.use(cors({ ... }));
app.use(express.json());
// Ausentes: X-Content-Type-Options, X-Frame-Options,
// Content-Security-Policy, Strict-Transport-Security,
// X-XSS-Protection, Referrer-Policy, Permissions-Policy
```

**Impacto real:**
Sin `X-Content-Type-Options: nosniff`, el navegador puede interpretar archivos subidos con MIME incorrecto como HTML/JS (amplifica C-2). Sin `X-Frame-Options: DENY`, la app es vulnerable a clickjacking. Sin `Content-Security-Policy`, ataques XSS tienen mayor superficie de explotación. Express expone `X-Powered-By: Express` que revela la tecnología.

---

### [A-2] Rol embebido en JWT sin reverificación en base de datos
**OWASP:** A01:2021 – Broken Access Control / A07:2021 – Identification and Authentication Failures
**Archivos:** `mini-jira-backend/src/routes/auth.ts:46-49`, `middleware/auth.ts:40`

**Evidencia:**
```typescript
// auth.ts:46-49 — el rol se firma en el token
const accessToken = jwt.sign(
  { sub: user.id, role: user.role },  // ← rol embebido
  jwtSecret,
  { expiresIn: '30m' },
);

// middleware/auth.ts:40 — se confía en el payload del token sin consultar DB
const payload = jwt.verify(token, secret) as JwtPayload;
req.user = payload;  // ← rol tomado del JWT, no de la DB
```

**Impacto real:**
Si un admin es degradado a `member` en la DB (vía `PATCH /api/users/:id`), conserva privilegios de admin durante hasta 30 minutos hasta que expire su token. En el sentido opuesto, si se promueve a admin, necesita re-login. Ventana de escalación de privilegios post-degradación de hasta 30 minutos.

---

### [A-3] Tokens de refresh acumulados sin rotación ni límite de sesiones
**OWASP:** A07:2021 – Identification and Authentication Failures
**Archivo:** `mini-jira-backend/src/routes/auth.ts:57-62`

**Evidencia:**
```typescript
// auth.ts:57-62 — cada login inserta un token nuevo sin borrar los anteriores
await db.insert(refreshTokens).values({
  id: uuidv4(),
  userId: user.id,
  tokenHash,
  expiresAt,
  // No se borran tokens previos del mismo usuario
});
```

**Impacto real:**
Un usuario que haga login 1000 veces tiene 1000 refresh tokens activos simultáneamente válidos durante 7 días. Si un atacante roba un refresh token (p. ej. via XSS o acceso físico) el usuario legítimo no puede invalidar las otras sesiones. No existe mecanismo de "cerrar todas las sesiones" efectivo sin eliminar manualmente todos los registros.

---

### [A-4] Broken Access Control en gestión de labels — cualquier usuario crea y elimina
**OWASP:** A01:2021 – Broken Access Control
**Archivo:** `mini-jira-backend/src/routes/labels.ts:23`, `labels.ts:54`

**Evidencia:**
```typescript
// labels.ts:23 — POST sin requireAdmin
router.post('/', verifyToken, async (req: Request, res: Response) => { ... });

// labels.ts:54 — DELETE sin requireAdmin
router.delete('/:id', verifyToken, async (req: Request, res: Response) => { ... });
```

**Impacto real:**
Cualquier `member` puede crear labels arbitrarias (spam, contenido inapropiado) o eliminar labels usadas por múltiples tickets activos, corrompiendo la clasificación de toda la base de datos de tickets sin posibilidad de recuperación (no hay soft-delete reverso expuesto).

---

### [A-5] Secretos JWT débiles y predecibles en variables de entorno
**OWASP:** A02:2021 – Cryptographic Failures
**Archivo:** `mini-jira-backend/.env:7-8`

**Evidencia:**
```
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_refresh_in_production
```

**Impacto real:**
Si el archivo `.env` es comprometido o si el equipo despliega en producción sin cambiar los valores, un atacante puede firmar JWTs arbitrarios con cualquier `sub` y `role: 'admin'`, obteniendo acceso total a la API. Adicionalmente, `JWT_REFRESH_SECRET` está definido en `.env` pero **nunca se usa** en el código — el sistema solo usa `JWT_SECRET` para todo, lo que indica que la separación de secretos planificada nunca se implementó.

---

## MEDIO

---

### [M-1] Sin paginación en GET /api/tickets — potencial DoS
**OWASP:** A06:2021 – Vulnerable and Outdated Components / DoS
**Archivo:** `mini-jira-backend/src/routes/tickets.ts:93-96`

**Evidencia:**
```typescript
// tickets.ts:93 — query sin LIMIT ni offset
let ticketRows = await db
  .select()
  .from(tickets)
  .where(and(...conditions));
// Retorna TODOS los tickets activos en una sola respuesta
```

**Impacto real:**
Con miles de tickets, una sola petición GET consume memoria proporcional al dataset completo tanto en DB como en Node.js. Un usuario malicioso (o un bug de frontend) puede generar carga sostenida que degrada el servicio para todos.

---

### [M-2] Política de contraseña insuficiente
**OWASP:** A07:2021 – Identification and Authentication Failures
**Archivo:** `mini-jira-backend/src/validators/auth.ts:5`

**Evidencia:**
```typescript
// validators/auth.ts:5 — mínimo de 1 carácter
password: z.string().min(1, 'Password is required'),
```

**Impacto real:**
El sistema acepta contraseñas de 1 carácter como `"a"`. Facilita ataques de fuerza bruta y permite credenciales extremadamente débiles que no serían detectadas por el sistema.

---

### [M-3] Cookie de refresh token con `sameSite: 'lax'` en lugar de `'strict'`
**OWASP:** A01:2021 – Broken Access Control (CSRF)
**Archivo:** `mini-jira-backend/src/routes/auth.ts:68`

**Evidencia:**
```typescript
// auth.ts:68
res.cookie('refreshToken', rawRefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',   // ← debería ser 'strict'
  expires: expiresAt,
  path: '/',
});
```

**Impacto real:**
`lax` permite que la cookie sea enviada en navegaciones de nivel superior iniciadas por sitios externos (p. ej. un link a `http://app.com/api/auth/refresh`). `strict` elimina completamente esta superficie de ataque. Para una app que nunca necesita la cookie cross-site, `strict` no tiene costo funcional.

---

### [M-4] Sin validación de formato UUID en parámetros de ruta
**OWASP:** A03:2021 – Injection
**Archivos:** `tickets.ts:185`, `comments.ts:19`, `labels.ts:54`

**Evidencia:**
```typescript
// tickets.ts:185-186 — req.params.id sin validar
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  const ticket = await getTicketWithRelations(req.params.id);
  // req.params.id puede ser cualquier string
```

**Impacto real:**
Aunque Drizzle ORM parametriza las queries (previniendo SQL injection directo), strings no-UUID son procesados innecesariamente, generan errores internos no controlados, y pueden explotar edge cases en la librería ORM. Un ID como `../../etc/passwd` o `'; DROP TABLE tickets; --` puede causar comportamientos inesperados en logs o futuros middlewares.

---

### [M-5] Tamaño del body JSON no limitado explícitamente
**OWASP:** A06:2021 – Vulnerable and Outdated Components
**Archivo:** `mini-jira-backend/src/index.ts:35`

**Evidencia:**
```typescript
// index.ts:35 — sin límite explícito (Express default: 100kb)
app.use(express.json());
```

**Impacto real:**
El default de 100kb de Express puede ser insuficiente o excesivo dependiendo del caso. Un comentario con `body` de 99kb es técnicamente válido. Más importante: el campo `description` de un ticket acepta texto sin límite de tamaño en el validator (`z.string().optional().nullable()`), combinado con un body de 100kb puede saturar la columna `text` de MySQL o causar lentitud en queries.

---

## BAJO

---

### [B-1] Header `X-Powered-By: Express` expone tecnología
**OWASP:** A05:2021 – Security Misconfiguration
**Archivo:** `mini-jira-backend/src/index.ts`

**Evidencia:**
Express lo incluye por defecto en todas las respuestas. Verificable con `curl -I http://localhost:3001/api/auth/login`.

**Impacto real:**
Facilita fingerprinting de la tecnología, permitiendo a atacantes buscar vulnerabilidades específicas de la versión de Express en uso.

---

### [B-2] `secure: false` para cookies en entornos no-producción
**OWASP:** A02:2021 – Cryptographic Failures
**Archivo:** `mini-jira-backend/src/routes/auth.ts:66`

**Evidencia:**
```typescript
secure: process.env.NODE_ENV === 'production',
// En desarrollo (NODE_ENV != 'production') la cookie puede enviarse por HTTP
```

**Impacto real:**
En entornos de staging o QA que corren sobre HTTP pero con datos reales, el refresh token viaja en claro y puede ser interceptado con un simple sniff de red.

---

### [B-3] Logs de error sin estructura ni sanitización
**OWASP:** A09:2021 – Security Logging and Monitoring Failures
**Archivo:** `mini-jira-backend/src/index.ts:72`

**Evidencia:**
```typescript
// index.ts:72
console.error('Unhandled error:', err);
```

**Impacto real:**
Los errores no estructurados dificultan la detección de patrones de ataque (múltiples 401 desde la misma IP, intentos de SQL injection). Sin logging de eventos de seguridad (logins fallidos, tokens inválidos), es imposible realizar forensics post-incidente o configurar alertas automáticas.

---

## Matriz de Riesgo

| ID  | Hallazgo                                  | Probabilidad | Impacto | Prioridad |
|-----|-------------------------------------------|:------------:|:-------:|:---------:|
| C-1 | Sin rate limiting en login                | Alta         | Crítico | P1        |
| C-2 | Uploads sin validación de tipo            | Media        | Crítico | P1        |
| C-3 | IDOR en PATCH/DELETE tickets              | Alta         | Alto    | P1        |
| A-1 | Sin headers de seguridad HTTP             | Media        | Alto    | P2        |
| A-2 | Rol JWT sin reverificación en DB          | Baja         | Alto    | P2        |
| A-3 | Refresh tokens acumulados sin rotación    | Media        | Alto    | P2        |
| A-4 | IDOR en POST/DELETE labels                | Alta         | Medio   | P2        |
| A-5 | Secretos JWT débiles / JWT_REFRESH_SECRET | Alta         | Crítico | P2        |
| M-1 | Sin paginación en GET /tickets            | Media        | Medio   | P3        |
| M-2 | Contraseña mínimo 1 carácter              | Alta         | Medio   | P3        |
| M-3 | sameSite: lax en refresh cookie           | Baja         | Medio   | P3        |
| M-4 | Sin validación UUID en params             | Media        | Bajo    | P3        |
| M-5 | Body JSON sin límite explícito            | Baja         | Bajo    | P3        |
| B-1 | X-Powered-By expone tecnología            | Alta         | Bajo    | P4        |
| B-2 | Cookie insegura en no-producción          | Media        | Bajo    | P4        |
| B-3 | Logging sin estructura                    | Alta         | Bajo    | P4        |
