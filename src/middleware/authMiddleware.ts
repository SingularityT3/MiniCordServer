import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../routes/auth.js";

interface JWTPayload {
  username: string;
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const auth_header = req.headers["authorization"];
  const token = auth_header && auth_header.split(" ")[1];
  if (!token) {
    res.status(401).send("Authorization token missing");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).send("Invalid or expired token");
  }
}
