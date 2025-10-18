import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { checkUserExists, getUser, getUsers, registerUser } from "../user.js";

dotenv.config();

let JWT_SECRET: string;
if (typeof process.env.JWT_SECRET !== "string") {
  console.warn("WARNING: JWT_SECRET is not set in env.");
  JWT_SECRET = "secret";
} else {
  JWT_SECRET = process.env.JWT_SECRET;
}

const authRouter = express.Router();
authRouter.use(express.json());

authRouter.get("/", (req, res) => {
  res.status(200).json(getUsers());
});

authRouter.get("/checkuser", (req, res) => {
  if (
    req.query.username === undefined ||
    typeof req.query.username !== "string"
  ) {
    res.status(400).send("Expected username");
    return;
  }

  res.status(200).json({
    avaliable: !checkUserExists(req.query.username),
  });
});

authRouter.post("/signup", async (req, res) => {
  if (
    req.body === undefined ||
    req.body.username === undefined ||
    req.body.password === undefined
  ) {
    res.status(400).send("Missing 'username' and 'password' fields");
    return;
  }

  if (checkUserExists(req.body.username)) {
    res.status(400).send("Username is already taken");
    return;
  }

  const hashed = await bcrypt.hash(req.body.password, 10);
  registerUser({
    username: req.body.username,
    password: hashed,
  });

  res.status(200).send();
});

authRouter.post("/login", async (req, res) => {
  if (
    req.body === undefined ||
    req.body.username === undefined ||
    req.body.password === undefined
  ) {
    res.status(400).send("Missing 'username' and 'password' fields");
    return;
  }

  const user = getUser(req.body.username);
  if (!user) {
    res.status(400).send("User does not exist");
    return;
  }

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) {
    res.status(401).send("Incorrect password");
    return;
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
  res.status(200).send(token);
});

export { authRouter, JWT_SECRET };
