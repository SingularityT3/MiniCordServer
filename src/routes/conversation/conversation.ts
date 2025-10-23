import express from "express";
import prisma from "../../prisma.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { memberRouter } from "./member.js";

export const conversationRouter = express.Router();

conversationRouter.use(verifyToken);

conversationRouter.param("conversationId", async (req, res, next) => {
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
      leaveTime: { not: null },
    },
  });
  if (!initiatingMember) {
    res.status(403).send("You are not a part of this conversation");
    return;
  }

  next();
});

conversationRouter.use("/members", memberRouter);

conversationRouter.get("/", async (req, res) => {
  const conversations = await prisma.conversationMember.findMany({
    select: { conversationId: true },
    where: { userId: req.user!.id },
  });

  res.status(200).json(conversations.map((c) => c.conversationId));
});

conversationRouter.post("/", async (req, res) => {
  if (!(req.body.members instanceof Array) || req.body.members.length < 1) {
    res.status(400).send("Expected at least one member");
    return;
  }

  let ids: string[] = [req.user!.id];
  for (const username of req.body.members) {
    if (typeof username !== "string") {
      res.status(400).send("Invalid usernames for members");
      return;
    }
    const user = await prisma.user.findUnique({
      select: { id: true },
      where: { username: username },
    });
    if (!user) {
      res.status(400).send(`Username '${username}' does not exist`);
      return;
    }
    ids.push(user.id);
  }

  const conversation = await prisma.conversation.create({});

  await prisma.conversationMember.createMany({
    data: ids.map((id) => {
      return { userId: id, conversationId: conversation.id };
    }),
  });

  res.status(200).send();
});

conversationRouter.patch("/:conversationId", async (req, res) => {
  const keys = Object.keys(req.body);
  if (keys.length > 1 || keys[0] !== "title") {
    res.status(400).send("Invalid patch fields");
    return;
  }

  await prisma.conversation.update({
    where: { id: req.params.conversationId },
    data: { title: req.body.title },
  });
  res.status(200).send();
});
