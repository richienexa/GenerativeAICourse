import { Router, Request, Response } from 'express';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { ZodError } from 'zod';
import { db } from '../db';
import { comments, attachments, users, tickets } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validateParam } from '../middleware/validateUuid';
import { createCommentSchema, updateCommentSchema } from '../validators/comments';

type AttachmentRow = typeof attachments.$inferSelect;

const router = Router({ mergeParams: true });

async function fetchCommentWithAuthor(commentId: string) {
  const rows = await db
    .select({
      id: comments.id,
      ticketId: comments.ticketId,
      body: comments.body,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  return rows[0] ?? null;
}

// GET /api/tickets/:ticketId/comments
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { ticketId } = req.params;

  const ticketRows = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), isNull(tickets.archivedAt)))
    .limit(1);

  if (!ticketRows[0]) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const commentRows = await db
    .select({
      id: comments.id,
      ticketId: comments.ticketId,
      body: comments.body,
      editedAt: comments.editedAt,
      archivedAt: comments.archivedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.ticketId, ticketId));

  const commentIds = commentRows.map((c) => c.id);

  const attachmentsByComment: Record<string, AttachmentRow[]> = {};

  if (commentIds.length > 0) {
    const attachmentRows = await db
      .select()
      .from(attachments)
      .where(
        and(
          inArray(attachments.commentId, commentIds),
          isNull(attachments.archivedAt),
        ),
      );

    for (const att of attachmentRows) {
      if (!attachmentsByComment[att.commentId]) {
        attachmentsByComment[att.commentId] = [];
      }
      attachmentsByComment[att.commentId].push(att);
    }
  }

  const result = commentRows.map((c) => ({
    ...c,
    archived_at: c.archivedAt,
    edited_at: c.editedAt,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    attachments: attachmentsByComment[c.id] ?? [],
  }));

  res.json(result);
});

// POST /api/tickets/:ticketId/comments
router.post(
  '/',
  verifyToken,
  upload.array('attachments'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { ticketId } = req.params;

      const ticketRows = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), isNull(tickets.archivedAt)))
        .limit(1);

      if (!ticketRows[0]) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const data = createCommentSchema.parse(req.body);
      const commentId = uuidv4();
      const now = new Date();

      await db.insert(comments).values({
        id: commentId,
        ticketId,
        authorId: req.user!.sub,
        body: data.body,
        createdAt: now,
        updatedAt: now,
      });

      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length > 0) {
        await db.insert(attachments).values(
          files.map((file) => ({
            id: uuidv4(),
            commentId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: path.join(process.env.UPLOAD_DIR ?? './uploads', file.filename),
          })),
        );
      }

      const comment = await fetchCommentWithAuthor(commentId);
      const attachmentRows = await db
        .select()
        .from(attachments)
        .where(and(eq(attachments.commentId, commentId), isNull(attachments.archivedAt)));

      res.status(201).json({
        ...comment,
        archived_at: null,
        edited_at: null,
        created_at: comment!.createdAt,
        updated_at: comment!.updatedAt,
        attachments: attachmentRows,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.errors });
        return;
      }
      throw err;
    }
  },
);

export default router;

// ─── Separate router for /api/comments/:id operations ────────────────────────

export const commentRouter = Router();

// PATCH /api/comments/:id
commentRouter.patch(
  '/:id',
  verifyToken,
  validateParam('id'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const commentRows = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, id), isNull(comments.archivedAt)))
        .limit(1);

      const comment = commentRows[0];
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      if (comment.authorId !== req.user!.sub) {
        res.status(403).json({ error: 'Only the author can edit a comment' });
        return;
      }

      const data = updateCommentSchema.parse(req.body);
      const now = new Date();

      await db
        .update(comments)
        .set({ body: data.body, editedAt: now, updatedAt: now })
        .where(eq(comments.id, id));

      const updated = await fetchCommentWithAuthor(id);
      res.json({
        ...updated,
        archived_at: null,
        edited_at: now,
        created_at: updated!.createdAt,
        updated_at: updated!.updatedAt,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.errors });
        return;
      }
      throw err;
    }
  },
);

// DELETE /api/comments/:id
commentRouter.delete(
  '/:id',
  verifyToken,
  validateParam('id'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const commentRows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), isNull(comments.archivedAt)))
      .limit(1);

    const comment = commentRows[0];
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const isAuthor = comment.authorId === req.user!.sub;
    const isAdmin = req.user!.role === 'admin';

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await db
      .update(comments)
      .set({ archivedAt: new Date() })
      .where(eq(comments.id, id));

    res.status(204).send();
  },
);

// Keep backward-compat export name
export const commentDeleteRouter = commentRouter;
