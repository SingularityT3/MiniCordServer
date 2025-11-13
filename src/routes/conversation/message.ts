import express from "express";
import { ObjectId } from "mongodb";
import prisma from "../../prisma.js";

const MAX_MSG_LIMIT = 10;

export const messageRouter = express.Router();

messageRouter.get("/", async (req, res) => {
  let before: string | null = null;
  if (typeof req.query.before === "string") {
    if (!ObjectId.isValid(req.query.before)) {
      res.status(400).send("Invalid object ID for 'before' query");
      return;
    }
    before = req.query.before;
  }

  let after: string | null = null;
  if (typeof req.query.after === "string") {
    if (before) {
      res
        .status(400)
        .send("Cannot use both 'before' and 'after' queries together");
      return;
    }
    if (!ObjectId.isValid(req.query.after)) {
      res.status(400).send("Invalid object ID for 'after' query");
      return;
    }
    after = req.query.after;
  }

  let limit = MAX_MSG_LIMIT;
  if (typeof req.query.limit === "string") {
    limit = Number(req.query.limit);
    if (isNaN(limit) || !Number.isInteger(limit)) {
      res.status(400).send("Invalid number for 'limit' query");
      return;
    }
    if (limit < 1) {
      res.status(400).send("Number should be at least one for 'limit' query");
      return;
    }
  }

  const take_amt = 1 + Math.min(limit, MAX_MSG_LIMIT);
  let db_query: any = {
    take: take_amt * (after ? 1 : -1),
    skip: 1,
    where: { conversationId: req.conversation!.id },
    orderBy: { id: "asc" },
  };
  if (before) {
    db_query.cursor = { id: before };
  } else if (after) {
    db_query.cursor = { id: after };
  } else {
    db_query.skip = 0;
  }
  const messages = await prisma.message.findMany(db_query);

  const nextCursorId = messages[after ? messages.length - 2 : 1]?.id;
  const hasNext = messages.length === take_amt;
  const pagination = {
    hasNext,
    cursor: hasNext ? nextCursorId : undefined,
  };

  const offset = after ? 0 : 1;
  res
    .status(200)
    .json({
      messages: hasNext
        ? messages.slice(offset, messages.length - (1 - offset))
        : messages,
      pagination,
    });
});

messageRouter.get("/:messageId", async (req, res) => {
  if (!ObjectId.isValid(req.params.messageId)) {
    res.status(400).send("Invalid object ID");
    return;
  }

  const message = await prisma.message.findUnique({
    where: { id: req.params.messageId },
  });

  if (!message) {
    res.status(404).send("Message not found");
    return;
  }

  res.status(200).json(message);
});

messageRouter.post("/", async (req, res) => {
  if (typeof req.body.content !== "string") {
    res.status(400).send("Message content missing");
    return;
  }

  const message = await prisma.message.create({
    data: {
      conversationId: req.conversation!.id,
      authorId: req.user!.id,
      content: req.body.content,
    },
  });

  res.status(201).json({ id: message.id });
});
