export interface IUserDoc {
  _id: import("mongoose").Types.ObjectId;
  walletAddress?: string;
  email?: string;
  mobile?: string;
  username?: string;
  name: string;
  bio: string;
  avatarUrl: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserDoc;
    }
  }
}
