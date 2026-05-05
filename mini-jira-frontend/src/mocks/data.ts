import type { User, Ticket, Comment } from '@/types'

export const MOCK_USERS: User[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    name: 'Laura García',
    email: 'laura.garcia@empresa.com',
    role: 'admin',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    name: 'Marcos Rodríguez',
    email: 'marcos.rodriguez@empresa.com',
    role: 'member',
    created_at: '2026-04-01T09:05:00Z',
    updated_at: '2026-04-01T09:05:00Z',
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Sofía Martínez',
    email: 'sofia.martinez@empresa.com',
    role: 'member',
    created_at: '2026-04-01T09:10:00Z',
    updated_at: '2026-04-01T09:10:00Z',
  },
]

const [laura, marcos, sofia] = MOCK_USERS

export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'b2000000-0000-0000-0000-000000000001',
    title: 'Configurar autenticación OAuth 2.0',
    description:
      'Integrar Google Workspace como proveedor OAuth. Registrar la app, configurar redirect URIs y validar el flujo Authorization Code con JWT de acceso y refresco.',
    status: 'todo',
    priority: 'high',
    is_blocked: false,
    created_by: laura.id,
    archived_at: null,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
    assignees: [marcos],
    labels: ['auth', 'backend'],
  },
  {
    id: 'b2000000-0000-0000-0000-000000000002',
    title: 'Implementar tablero Kanban con drag-and-drop',
    description:
      'Crear las 4 columnas (Por hacer, En progreso, Review, Listo) con tarjetas arrastrables. El badge Bloqueado debe coexistir con cualquier columna sin ocupar una propia.',
    status: 'in_progress',
    priority: 'high',
    is_blocked: false,
    created_by: marcos.id,
    archived_at: null,
    created_at: '2026-04-11T08:30:00Z',
    updated_at: '2026-04-14T16:00:00Z',
    assignees: [marcos, sofia],
    labels: ['frontend', 'ui'],
  },
  {
    id: 'b2000000-0000-0000-0000-000000000003',
    title: 'Crear endpoint PATCH /api/tickets/:id',
    description:
      'Incluir validación de version para Optimistic Locking. Devolver 409 si la versión del cliente no coincide con la de la BD.',
    status: 'in_progress',
    priority: 'high',
    is_blocked: true,
    created_by: marcos.id,
    archived_at: null,
    created_at: '2026-04-12T09:00:00Z',
    updated_at: '2026-04-15T11:30:00Z',
    assignees: [marcos],
    labels: ['backend', 'api', 'concurrencia'],
  },
  {
    id: 'b2000000-0000-0000-0000-000000000004',
    title: 'Diseñar dashboard de métricas',
    description:
      'Mostrar: tickets cerrados por mes, tickets por estado (snapshot), tickets por miembro. Calculados en tiempo real sin tabla de hechos separada.',
    status: 'review',
    priority: 'medium',
    is_blocked: false,
    created_by: sofia.id,
    archived_at: null,
    created_at: '2026-04-13T10:15:00Z',
    updated_at: '2026-04-17T09:45:00Z',
    assignees: [sofia],
    labels: ['frontend', 'métricas'],
  },
  {
    id: 'b2000000-0000-0000-0000-000000000005',
    title: 'Exportación de métricas a CSV',
    description:
      'Endpoint GET /api/metrics/export con streaming fila a fila. Soportar filtros: rango de fechas, estado y asignado. Cumplir RFC 4180.',
    status: 'done',
    priority: 'medium',
    is_blocked: false,
    created_by: laura.id,
    archived_at: null,
    created_at: '2026-04-14T11:00:00Z',
    updated_at: '2026-04-18T17:00:00Z',
    assignees: [sofia],
    labels: ['backend', 'métricas'],
  },
]

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c3000000-0000-0000-0000-000000000001',
    ticket_id: 'b2000000-0000-0000-0000-000000000002',
    author: laura,
    body: 'Revisé el prototipo. Las 4 columnas se ven bien. Asegúrate de que el badge Bloqueado sea visible en modo de alto contraste.',
    archived_at: null,
    created_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'c3000000-0000-0000-0000-000000000002',
    ticket_id: 'b2000000-0000-0000-0000-000000000003',
    author: marcos,
    body: 'Bloqueado hasta que @laura.garcia confirme la matriz de permisos para tickets ajenos.',
    archived_at: null,
    created_at: '2026-04-15T11:00:00Z',
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    ticket_id: 'b2000000-0000-0000-0000-000000000004',
    author: sofia,
    body: 'Borrador inicial — ignorar este comentario.',
    archived_at: '2026-04-16T09:00:00Z',
    created_at: '2026-04-16T08:55:00Z',
  },
  {
    id: 'c3000000-0000-0000-0000-000000000004',
    ticket_id: 'b2000000-0000-0000-0000-000000000005',
    author: laura,
    body: 'Export validado contra RFC 4180. Campos con comas y saltos de línea correctamente entre comillas. Ticket listo para cerrar.',
    archived_at: null,
    created_at: '2026-04-18T16:45:00Z',
  },
]
