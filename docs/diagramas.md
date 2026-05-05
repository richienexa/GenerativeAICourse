# Diagramas técnicos — Mini Jira

> Diagramas en sintaxis Mermaid válida. Renderizables en GitHub, GitLab, Notion y VS Code con la extensión Mermaid Preview.
>
> **Nota:** Los archivos `architecture.md` y `specs.md` de referencia indican un diseño con Last-Write-Wins (sin Pessimistic Lock en la implementación actual). Los diagramas reflejan el sistema tal como está implementado en el código fuente.

---

## 1. Flujo de autenticación JWT

```mermaid
sequenceDiagram
    actor Cliente as Cliente (Browser)
    participant FE as Frontend<br/>(React)
    participant API as Backend<br/>(Express)
    participant DB as MySQL

    Cliente->>FE: Introduce email + contraseña
    FE->>API: POST /api/auth/login<br/>{ email, password }
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: User row (passwordHash, role, archivedAt)
    
    alt Usuario no existe o archivado
        API-->>FE: 401 Invalid email or password
    else Contraseña incorrecta
        API-->>FE: 401 Invalid email or password
    else Credenciales válidas
        API->>API: bcrypt.compare(password, hash)
        API->>API: jwt.sign({ sub, role }, secret, 30m)
        API->>API: sha256(uuid) → tokenHash
        API->>DB: DELETE tokens expirados del usuario
        API->>DB: INSERT refresh_tokens (tokenHash, expiresAt)
        API-->>FE: 200 { accessToken }<br/>Set-Cookie: refreshToken=<uuid> HttpOnly
        FE->>FE: Guarda accessToken en authStore (Zustand)
        FE-->>Cliente: Redirige a /board
    end

    Note over FE,API: --- Llamada autenticada (token válido) ---

    Cliente->>FE: Navega al tablero
    FE->>API: GET /api/tickets<br/>Authorization: Bearer {accessToken}
    API->>API: jwt.verify(token, secret)
    API->>DB: SELECT user WHERE id = sub (re-verifica rol y archivedAt)
    DB-->>API: User activo
    API->>DB: SELECT tickets...
    DB-->>API: Tickets
    API-->>FE: 200 { data: [...], page, limit }

    Note over FE,API: --- Renovación de token (access expirado) ---

    FE->>API: GET /api/tickets (token expirado)
    API-->>FE: 401 Unauthorized
    FE->>API: POST /api/auth/refresh<br/>(cookie refreshToken automática)
    API->>API: sha256(rawToken) → hash
    API->>DB: SELECT refresh_tokens WHERE tokenHash = hash
    DB-->>API: Token válido + userId
    API->>DB: SELECT user WHERE id = userId
    DB-->>API: User activo
    API->>API: jwt.sign({ sub, role }, secret, 30m)
    API->>DB: DELETE token antiguo
    API->>DB: INSERT nuevo token rotado
    API-->>FE: 200 { accessToken }<br/>Set-Cookie: nueva cookie rotada
    FE->>FE: Actualiza accessToken en authStore
    FE->>API: Reintenta GET /api/tickets

    Note over FE,API: --- Logout ---

    Cliente->>FE: Clic en "Cerrar sesión"
    FE->>API: POST /api/auth/logout<br/>Authorization: Bearer {accessToken}
    API->>DB: DELETE refresh_tokens WHERE tokenHash = sha256(rawToken)
    API-->>FE: 204 + Clear-Cookie: refreshToken
    FE->>FE: clearAuth() — borra store
    FE-->>Cliente: Redirige a /login
```

---

## 2. Mover ticket entre columnas (drag & drop)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant FE as Frontend<br/>(React + dnd-kit)
    participant OPT as useOptimistic<br/>(React 19)
    participant QUERY as TanStack Query
    participant API as Backend<br/>(Express)
    participant DB as MySQL
    participant SSE as SSE Clients<br/>(otros usuarios)

    U->>FE: Arrastra tarjeta de "Por hacer" a "En progreso"
    FE->>FE: handleDragEnd — detecta newStatus = 'in_progress'
    
    FE->>OPT: applyOptimistic({ id, status: 'in_progress' })
    OPT-->>FE: optimisticTickets con tarjeta movida (UI instantánea)

    FE->>QUERY: mutate({ id, status: 'in_progress' })
    QUERY->>API: PATCH /api/tickets/{id}<br/>Authorization: Bearer {token}<br/>{ "status": "in_progress" }

    API->>API: verifyToken + re-verifica user en DB
    API->>DB: SELECT ticket WHERE id = ? AND archived_at IS NULL
    
    alt Ticket no encontrado
        API-->>QUERY: 404 Not found
        OPT-->>FE: Revierte estado optimista (stale data)
    else Sin permisos (ni propietario ni admin)
        API-->>QUERY: 403 Forbidden
        OPT-->>FE: Revierte estado optimista
    else Autorizado
        API->>DB: UPDATE tickets SET status='in_progress', updated_at=NOW()
        API->>DB: INSERT activity_logs<br/>{ action:'updated', field:'status',<br/>  oldValue:'todo', newValue:'in_progress' }
        API->>DB: SELECT ticket + assignees + labels (getTicketWithRelations)
        DB-->>API: Ticket actualizado completo
        API->>SSE: broadcastBoardUpdate('ticket:updated', ticket)
        SSE-->>FE: Evento SSE → otros clientes reciben el cambio
        API-->>QUERY: 200 Ticket actualizado
        QUERY->>QUERY: invalidateQueries([TICKETS_KEY])
        QUERY->>API: GET /api/tickets (refresco background)
        API-->>QUERY: Lista actualizada
        QUERY-->>FE: Estado definitivo en pantalla
    end
```

---

## 3. Ciclo de vida de un ticket

```mermaid
flowchart LR
    CREATE([➕ Crear ticket\nPOST /tickets]) --> TODO

    subgraph ESTADOS ["Estados del ticket"]
        TODO["📋 TODO\n(Por hacer)"]
        IP["🔄 IN_PROGRESS\n(En progreso)"]
        REVIEW["👁 REVIEW"]
        DONE["✅ DONE\n(Listo)"]
    end

    TODO -- "PATCH status=in_progress" --> IP
    IP -- "PATCH status=review" --> REVIEW
    REVIEW -- "PATCH status=done" --> DONE
    REVIEW -- "PATCH status=in_progress\n(requiere cambios)" --> IP
    IP -- "PATCH status=todo\n(regresión)" --> TODO
    DONE -- "PATCH status=in_progress\n(reapertura)" --> IP

    TODO -- "PATCH is_blocked=true" --> BLOCKED
    IP -- "PATCH is_blocked=true" --> BLOCKED
    BLOCKED["🚫 BLOQUEADO\n(badge visual,\nestado no cambia)"]
    BLOCKED -- "PATCH is_blocked=false" --> TODO
    BLOCKED -- "PATCH is_blocked=false" --> IP

    IP -- "PATCH due_date=..." --> DUEDATE["📅 Con fecha límite\n(badge rojo si vence)"]
    DUEDATE -- "llega la fecha" --> OVERDUE["🔴 VENCIDO\n(badge error color)"]
    OVERDUE -- "PATCH status=done" --> DONE

    DONE -- "DELETE /tickets/:id\n(propietario o admin)" --> ARCHIVED["🗃 ARCHIVADO\narchived_at != null\n(soft delete)"]
    TODO -- "DELETE" --> ARCHIVED
    IP -- "DELETE" --> ARCHIVED
    REVIEW -- "DELETE" --> ARCHIVED

    ARCHIVED -. "No aparece en\nGET /tickets\nni en el tablero" .-> END(( ))

    subgraph ACTIVITY ["Log de actividad (inmutable)"]
        direction TB
        LOG1["📝 created"]
        LOG2["📝 status: todo → in_progress"]
        LOG3["📝 priority: low → high"]
    end

    CREATE -.->|"INSERT activity_logs\naction='created'"| LOG1
    IP -.->|"INSERT activity_logs"| LOG2
    REVIEW -.->|"INSERT activity_logs"| LOG3

    style BLOCKED fill:#fee2e2,stroke:#dc2626
    style OVERDUE fill:#fee2e2,stroke:#dc2626
    style ARCHIVED fill:#e5e7eb,stroke:#9ca3af
    style DONE fill:#d1fae5,stroke:#059669
    style ACTIVITY fill:#f0f9ff,stroke:#0ea5e9
```
