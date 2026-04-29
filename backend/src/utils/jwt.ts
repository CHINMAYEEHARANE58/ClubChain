import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface TokenPayload {
  sub: string;
  email: string;
}

const sign = (secret: string, payload: TokenPayload, expiresIn: string): string => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, secret, options);
};

export const signAccessToken = (payload: TokenPayload) =>
  sign(env.JWT_ACCESS_SECRET, payload, env.ACCESS_TOKEN_TTL);

export const signRefreshToken = (payload: TokenPayload) =>
  sign(env.JWT_REFRESH_SECRET, payload, env.REFRESH_TOKEN_TTL);

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

export const verifyRefreshToken = (token: string): TokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
