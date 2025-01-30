import { Handler } from "../../utils/make-api";
import Boom from "@hapi/boom";
import { prisma } from "../../db/index";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "auth_token"; // Using a specific name for the auth cookie

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables.");
}

interface GenerateAccessTokenTypes {
  id: string;
  role: string | null;
}

const generateAccessToken = async ({ id, role }: GenerateAccessTokenTypes) => {
  return jwt.sign(
    {
      userId: id,
      role,
      // Add additional claims for security
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // Add unique identifier for the token
    },
    JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

interface LoginRequest {
  email: string;
  password: string;
}

const createSecureCookie = (token: string) => {
  // Create a secure HTTP-only cookie
  return serialize(COOKIE_NAME, token, {
    httpOnly: true, // Prevents JavaScript access
    secure: process.env.NODE_ENV === "production", // Use HTTPS in production
    sameSite: "strict", // Protect against CSRF
    path: "/",
    maxAge: 3600, // 1 hour in seconds
    // domain: process.env.COOKIE_DOMAIN, // Uncomment and set for production
  });
};

const handler: Handler<"login"> = async (request, response) => {
  const { email, password } = request as LoginRequest;

  if (!email?.trim() || !password?.trim()) {
    throw Boom.badRequest("All fields are required.");
  }

  try {
    // Rate limiting check could be added here
    const userExist = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        // Don't select unnecessary fields
      },
    });

    if (!userExist) {
      throw Boom.notFound("Invalid credentials."); // Don't specify which credential was wrong
    }

    const checkPassword = await bcrypt.compare(password, userExist.password);
    if (!checkPassword) {
      throw Boom.unauthorized("Invalid credentials.");
    }

    const token = await generateAccessToken({
      id: userExist.id,
      role: userExist.role,
    });

    if (!token) {
      throw Boom.unauthorized("Authentication failed.");
    }

    const secureCookie = createSecureCookie(token);

    // Return minimal user info and set cookie via headers
    return {
      success: true,
      status: 200,
      data: {
        user: {
          id: userExist.id,
          email: userExist.email,
          role: userExist.role,
        },
      },
      headers: {
        "Set-Cookie": secureCookie,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Boom.Boom) {
      throw error;
    }
    // Don't expose internal errors to client
    throw Boom.unauthorized("Authentication failed.");
  }
};

export default handler;
