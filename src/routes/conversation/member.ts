import { ObjectId } from "mongodb";
import prisma from "../../prisma.js";
import express from "express";

export const memberRouter = express.Router();

memberRouter.get("/", async (req, res) => {
  const members = await prisma.conversationMember.findMany({
    select: { userId: true, joinTime: true },
    where: { conversationId: req.conversation!.id, leaveTime: null },
  });
  res.status(200).json(members);
});

memberRouter.post("/", async (req, res) => {
  if (!req.body.id) {
    res.status(400).send("User ID not specified");
    return;
  }
  if (!ObjectId.isValid(req.body.id)) {
    res.status(400).send("Invalid user ID");
    return;
  }
  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { id: req.body.userId },
  });
  if (!user) {
    res.status(400).send("User does not exist");
    return;
  }

  const member = await prisma.conversationMember.findFirst({
    select: { id: true },
    where: {
      conversationId: req.conversation!.id,
      userId: user.id,
      leaveTime: { not: null },
    },
  });
  if (member) {
    res.status(400).send("User is already in the conversation");
    return;
  }

  const newMember = await prisma.conversationMember.create({
    data: {
      conversationId: req.conversation!.id,
      userId: user.id,
      leaveTime: null,
    },
  });

  res.set("Location", `/conversations/${req.conversation!.id}/${newMember.id}`);
  res.status(201).json({ id: newMember.id });
});

memberRouter.param("memberId", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.memberId!)) {
    res.status(400).send("Invalid member ID");
    return;
  }
  const member = await prisma.conversationMember.findFirst({
    select: { id: true },
    where: {
      conversationId: req.conversation!.id,
      userId: req.params.memberId!,
      leaveTime: { not: null },
    },
  });
  if (!member) {
    res.status(404).send("No such member");
    return;
  }
  req.member = member;
  next();
});

memberRouter.delete("/:memberId", async (req, res) => {
  await prisma.conversationMember.update({
    where: { id: req.member!.id },
    data: { leaveTime: new Date() },
  });
  res.status(200).send();
});
