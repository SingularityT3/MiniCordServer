import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { memberRouter } from "./member.js";
import { ObjectId } from "mongodb";
import { messageRouter } from "./message.js";

export const conversationRouter = express.Router();

conversationRouter.use(verifyToken);

conversationRouter.param("conversationId", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.conversationId!)) {
    res.status(400).send("Invalid conversation ID");
    return;
  }
  const conversation = await prisma.conversation.findUnique({
    select: { id: true },
    where: { id: req.params.conversationId! },
  });
  if (!conversation) {
    res.status(404).send("Conversation does not exist");
    return;
  }

  const initiatingMember = await prisma.conversationMember.findFirst({
    select: { id: true },
    where: {
      conversationId: conversation.id,
      userId: req.user!.id,
      OR: [{ leaveTime: null }, { NOT: { leaveTime: { not: null } } }],
    },
  });
  if (!initiatingMember) {
    res.status(403).send("You are not a part of this conversation");
    return;
  }

  req.conversation = conversation;
  next();
});

conversationRouter.use("/:conversationId/members", memberRouter);
conversationRouter.use("/:conversationId/messages", messageRouter);

conversationRouter.get("/", async (req, res) => {
  const conversationMembers = await prisma.conversationMember.findMany({
    select: { conversationId: true },
    where: { userId: req.user!.id },
  });

  const conversations = await prisma.conversation.findMany({
    where: { id: { in: conversationMembers.map((c) => c.conversationId) } },
  });

  res.status(200).json(conversations);
});

conversationRouter.post("/", async (req, res) => {
  if (
    !req.body.type ||
    (req.body.type !== "DIRECT_MESSAGE" && req.body.type !== "GROUP")
  ) {
    res
      .status(400)
      .send("Expected 'DIRECT_MESSAGE' or 'GROUP' as conversation type");
    return;
  }

  if (!(req.body.members instanceof Array) || req.body.members.length < 1) {
    res.status(400).send("Expected at least one member");
    return;
  }

  if (req.body.type === "DIRECT_MESSAGE" && req.body.members.length > 1) {
    res.status(400).send("Direct messages cannot have more than one member");
    return;
  }

  let ids: string[] = [req.user!.id];
  for (const userId of req.body.members) {
    if (!ObjectId.isValid(userId)) {
      res.status(400).send("Invalid user ID for member");
      return;
    }
    const user = await prisma.user.findUnique({
      select: { id: true },
      where: { id: userId },
    });
    if (!user) {
      res.status(400).send(`User '${userId}' does not exist`);
      return;
    }
    ids.push(userId);
  }

  if (req.body.type === "DIRECT_MESSAGE") {
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT_MESSAGE",
        AND: [
          { members: { some: { userId: req.user!.id } } },
          { members: { some: { userId: req.body.members[0] } } },
        ],
      },
    });

    if (existingConversation) {
      res.status(409).send("DM already exists");
      return;
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: req.body.title || null,
      type: req.body.type,
    },
  });

  await prisma.conversationMember.createMany({
    data: ids.map((id) => {
      return { userId: id, conversationId: conversation.id, leaveTime: null };
    }),
  });

  res.set("Location", `/conversations/${conversation.id}`);
  res.status(201).json({ id: conversation.id });
});

conversationRouter.patch("/:conversationId", async (req, res) => {
  const keys = Object.keys(req.body);
  if (keys.length > 1 || keys[0] !== "title") {
    res.status(400).send("Invalid patch fields (expected only title)");
    return;
  }

  await prisma.conversation.update({
    where: { id: req.conversation!.id },
    data: { title: req.body.title },
  });
  res.status(200).send();
});
