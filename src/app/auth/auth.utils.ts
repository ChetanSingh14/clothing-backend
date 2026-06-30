import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJWTToken = (user: { id: number; email: string }): string => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "30d" }
  );
};
