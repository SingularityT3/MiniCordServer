import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { friendsRouter } from "./routes/friends.js";
import { conversationRouter } from "./routes/conversation/conversation.js";

dotenv.config();

const app = express();
const port = 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    optionsSuccessStatus: 204,
  })
);
app.use(express.urlencoded());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/friends", friendsRouter);
app.use("/conversation", conversationRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
