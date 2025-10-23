import prisma from "../../prisma.js";
import express from "express";

export const memberRouter = express.Router();

type ConversationRequest<P = {}> = express.Request<
  { conversationId: string } & P
>;

memberRouter.post("/", async (req: ConversationRequest, res) => {
  const username = req.body.username;
  if (!username) {
    res.status(400).send("Username not specified");
    return;
  }
  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: username },
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
