import { ObjectId } from "mongodb";
import prisma from "../../prisma.js";
import express from "express";

export const memberRouter = express.Router();

type ConversationRequest<P = {}> = express.Request<
  { conversationId: string } & P
>;

memberRouter.post("/", async (req: ConversationRequest, res) => {
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
      conversationId: req.params.conversationId,
      userId: user.id,
      leaveTime: { not: null },
    },
  });
  if (member) {
    res.status(400).send("User is already in the conversation");
    return;
  }

  await prisma.conversationMember.create({
    data: {
      conversationId: req.params.conversationId,
      userId: user.id,
    },
  });

  res.status(201).send();
});

memberRouter.delete(
  "/:memberId",
  async (req: ConversationRequest<{ memberId: string }>, res) => {
    if (!ObjectId.isValid(req.params.memberId!)) {
      res.status(400).send("Invalid member ID");
      return;
    }
    const member = await prisma.conversationMember.findFirst({
      select: { id: true },
      where: {
        conversationId: req.params.conversationId,
        userId: req.params.memberId,
        leaveTime: { not: null },
      },
    });
    if (!member) {
      res.status(404).send("No such member");
      return;
    }

    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { leaveTime: new Date() },
    });
    res.status(200).send();
  }
);
