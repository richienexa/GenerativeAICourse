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
import { createCommentSchema } from '../validators/comments';

// Type alias for an attachment row
type AttachmentRow = typeof attachments.$inferSelect;

const router = Router({ mergeParams: true });

// GET /api/tickets/:ticketId/comments
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { ticketId } = req.params;

  // Verify ticket exists and is not archived
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
    .where(and(eq(comments.ticketId, ticketId), isNull(comments.archivedAt)));

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

      // Handle file attachments
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

      // Fetch created comment with author and attachments
      const commentRows = await db
        .select({
          id: comments.id,
          ticketId: comments.ticketId,
          body: comments.body,
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

      const attachmentRows = await db
        .select()
        .from(attachments)
        .where(
          and(eq(attachments.commentId, commentId), isNull(attachments.archivedAt)),
        );

      res.status(201).json({
        ...commentRows[0],
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

// ─── Separate router for DELETE /api/comments/:id ────────────────────────────

export const commentDeleteRouter = Router();

commentDeleteRouter.delete(
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

    // Only author or admin can delete
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
