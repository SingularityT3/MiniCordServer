import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import prisma from "../prisma.js";
import { ObjectId } from "mongodb";

export const friendsRouter = express.Router();
friendsRouter.use(verifyToken);

friendsRouter.get("/", async (req, res) => {
  const userId = req.user!.id;

  const friends = await prisma.friend.findMany({
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      sendTime: true,
      acceptTime: true,
    },
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
  });

  res.status(200).json(friends);
});

friendsRouter.post("/", async (req, res) => {
  if (typeof req.body.recipientId !== "string") {
    res.status(400).send("Missing field 'recipientId'");
    return;
  }
  if (!ObjectId.isValid(req.body.recipientId)) {
    res.status(400).send("Invalid recipient ID");
    return;
  }
  const friendUser = await prisma.user.findUnique({
    select: { id: true },
    where: { id: req.body.recipientId },
  });
  if (!friendUser) {
    res.status(400).send("Recipient does not exist");
    return;
  }

  const friend = await prisma.friend.findFirst({
    select: { acceptTime: true },
    where: {
      OR: [
        { senderId: req.user!.id, recipientId: req.body.recipientId },
        { senderId: req.body.recipientId, recipientId: req.user!.id },
      ],
    },
  });
  if (friend) {
    res
      .status(409)
      .send(
        friend.acceptTime === null
          ? "Friend request already exists"
          : "Already friends with recipient"
      );
    return;
  }

  await prisma.friend.create({
    data: {
      senderId: req.user!.id,
      recipientId: req.body.recipientId,
    },
  });
  res.status(200).send();
});

friendsRouter.param("requestId", async (req, res, next) => {
  if (!ObjectId.isValid(req.params.requestId!)) {
    res.status(400).send("Invalid request ID");
    return;
  }
  const friend = await prisma.friend.findUnique({
    select: { senderId: true, recipientId: true },
    where: { id: req.params.requestId! },
  });
  if (!friend) {
    res.status(404).send("Request does not exist");
    return;
  }

  req.user!.isSender = req.user!.id === friend.senderId;
  if (!req.user!.isSender && req.user!.id !== friend.recipientId) {
    res.status(403).send();
    return;
  }

  next();
});

friendsRouter.post("/:requestId/accept", async (req, res) => {
  if (req.user!.isSender) {
    res.status(403).send("Sender cannot accept request");
    return;
  }
  await prisma.friend.update({
    where: { id: req.params.requestId },
    data: { acceptTime: new Date() },
  });
  res.status(200).send();
});

friendsRouter.delete("/:requestId", async (req, res) => {
  await prisma.friend.delete({
    where: { id: req.params.requestId },
  });
  res.status(200).send();
});
