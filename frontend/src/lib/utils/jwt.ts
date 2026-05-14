import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/config/env";

const secret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

/**
 * Signs a JWT token using HS256, expires in 7 days.
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}

/**
 * Verifies and decodes a JWT token.
 * Returns the payload if valid, or null if invalid/expired.
 */
export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
