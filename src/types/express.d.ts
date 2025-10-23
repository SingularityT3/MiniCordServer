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
    }
  }
}
