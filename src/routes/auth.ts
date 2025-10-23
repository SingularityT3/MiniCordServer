import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

let JWT_SECRET: string;
if (typeof process.env.JWT_SECRET !== "string") {
  console.warn("WARNING: JWT_SECRET is not set in env.");
  JWT_SECRET = "secret";
} else {
  JWT_SECRET = process.env.JWT_SECRET;
}

const authRouter = express.Router();

authRouter.get("/checkuser/:username", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: req.params.username },
  });
  res.status(200).json({
    available: !user,
  });
});

authRouter.post("/signup", getUser, async (req, res) => {
  if (req.user) {
    res.status(409).send("Username is already taken");
    return;
  }

  const hashed = await bcrypt.hash(req.body.password, 10);
  await prisma.user.create({
    data: {
      username: req.body.username,
      password: hashed,
    },
  });

  res.status(200).send();
});

authRouter.post("/login", getUser, async (req, res) => {
  if (!req.user) {
    res.status(400).send("User does not exist");
    return;
  }

  const match = await bcrypt.compare(req.body.password, req.user.password!);
  if (!match) {
    res.status(401).send("Incorrect password");
    return;
  }

  const token = jwt.sign(
    { id: req.user.id, username: req.user.username },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
  res.status(200).send(token);
});

async function getUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (
    !req.body ||
    typeof req.body.username !== "string" ||
    typeof req.body.password !== "string"
  ) {
    res.status(400).send("Missing 'username' and 'password' fields");
    return;
  }

  const user = await prisma.user.findUnique({
    select: { id: true, username: true, password: true },
    where: { username: req.body.username },
  });

  if (user) {
    req.user = user;
  }
  next();
}

export { authRouter, JWT_SECRET };
