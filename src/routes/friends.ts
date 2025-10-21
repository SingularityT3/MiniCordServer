import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import prisma from "../prisma.js";
import type { Prisma } from "@prisma/client";

export const friendsRouter = express.Router();
friendsRouter.use(verifyToken);

friendsRouter.get("/", async (req, res) => {
  const userId = req.user!.id;

  const friends = await prisma.friend.findMany({
    select: {
      senderId: true,
      recipientId: true,
      sendTime: true,
      acceptTime: true,
    },
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
  });

  if (friends) {
    res.status(200).json(friends);
  } else {
    res.status(404).send();
  }
});

friendsRouter.post("/sendRequest", getFriendRelation(true, false), async (req, res) => {
  if (req.friend!.friendRelationId) {
    res.status(400).send("Already friends or request pending");
    return;
  }
  
  await prisma.friend.create({
    data: {
      senderId: req.user!.id,
      recipientId: req.friend!.id,
    },
  });
  res.status(200).send();
});

friendsRouter.post(
  "/acceptRequest",
  getFriendRelation(false, true),
  async (req, res) => {
    await prisma.friend.update({
      where: { id: req.friend!.friendRelationId! },
      data: { acceptTime: Date() },
    });
    res.status(200).send();
  }
);

friendsRouter.delete("/", getFriendRelation(true, true), async (req, res) => {
  await prisma.friend.delete({
    where: { id: req.friend!.friendRelationId! },
  });
  res.status(200).send();
});

async function getFriendUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (typeof req.body.username !== "string") {
    res.status(400).send("Expected username");
    return;
  }
  const friendUsername = req.body.username;

  const friendUser = await prisma.user.findUnique({
    select: { id: true },
    where: { username: friendUsername },
  });

  if (!friendUser) {
    res.status(404).send("No such user");
    return;
  }

  req.friend = { id: friendUser.id, username: friendUsername };
  next();
}

function getFriendRelation(bidirectional: boolean, raiseErr: boolean) {
  return function (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    getFriendUser(req, res, async () => {
      const query1: Prisma.FriendWhereInput = {
        senderId: req.friend!.id,
        recipientId: req.user!.id,
      };

      const query: Prisma.FriendWhereInput = bidirectional
        ? {
            OR: [
              query1,
              {
                senderId: req.user!.id,
                recipientId: req.friend!.id,
              },
            ],
          }
        : query1;

      const friend = await prisma.friend.findFirst({
        select: { id: true },
        where: query,
      });

      if (!friend) {
        if (raiseErr) {
          res
            .status(400)
            .send("User is not a friend or has not sent a friend request");
        } else {
          next();
        }
        return;
      }

      req.friend!.friendRelationId = friend.id;
      next();
    });
  };
}
