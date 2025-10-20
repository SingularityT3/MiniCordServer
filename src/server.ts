import express from "express";
import { authRouter } from "./routes/auth.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/protected", verifyToken, (req, res) => {
  res.send("You are logged in. Username: " + req.user?.username);
});

app.use("/auth", authRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
