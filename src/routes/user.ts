import express from "express";
import prisma from "../prisma.js";

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
