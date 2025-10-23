import express from "express";
import prisma from "../prisma.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { ObjectId } from "mongodb";

export const userRouter = express.Router();

userRouter.get("/self", verifyToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    select: { id: true, username: true },
    where: { id: req.user!.id },
  });
  res.status(200).json(user!);
});

userRouter.get("/by-username/:username", async (req, res) => {
  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: req.params.username },
  });
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).send();
  }
});

userRouter.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id!)) {
    res.status(400).send("Invalid user ID");
    return;
  }
  const user = await prisma.user.findUnique({
    select: { username: true },
    where: { id: req.params.id },
  });

  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).send();
  }
});
