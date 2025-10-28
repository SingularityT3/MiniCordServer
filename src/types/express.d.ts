import type { Prisma } from "@prisma/client";
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        password?: string;
        isSender?: boolean; // for friend requests
      };
      conversation?: {
        id: string;
      };
      member?: {
        id: string;
      };
    }
  }
}
