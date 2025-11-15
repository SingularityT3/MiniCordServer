import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
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

// Profiles
const mediaDir = "media/profiles/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req: express.Request, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user!.id}${ext}`;
    cb(null, filename);
  }
});

const uploadProfile = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 2 },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
})

userRouter.post("/:id/profile", verifyToken, uploadProfile.single("avatar"), async (req, res) => {
  if (req.user!.id !== req.params.id) {
    return res.status(403).send();
  }
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }
  res.status(201).send();
});

userRouter.get("/:id/profile", async (req, res) => {
  try {
    const files = fs.readdirSync(mediaDir);
    const file = files.find(f => f.startsWith(req.params.id));
    if (!file) {
      throw new Error("File not found");
    }
    res.sendFile(path.resolve(mediaDir, file));
  } catch (err) {
    return res.status(404).send("Profile image not found");
  }
});
