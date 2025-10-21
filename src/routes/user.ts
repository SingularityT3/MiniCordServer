import express from "express";
import prisma from "../prisma.js";
import { verifyToken } from "../middleware/authMiddleware.js";

export const userRouter = express.Router();

userRouter.get("/", async (req, res) => {
  if (typeof req.query.id !== "string") {
    res.status(400).send("Specify user ID to query");
    return;
  }

  const queryId = req.query.id;
  const user = await prisma.user.findUnique({
    select: { username: true },
    where: { id: queryId },
  });

  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).send();
  }
});

userRouter.get("/self", verifyToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    select: { id: true, username: true },
    where: { id: req.user!.id }
  });
  res.status(200).json(user!);
});
