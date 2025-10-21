import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
      friend?: {
        id: string;
        username: string;
        friendRelationId?: string;
      };
    }
  }
}
