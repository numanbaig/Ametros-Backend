import { Handler } from "../../utils/make-api";
import Boom from "@hapi/boom";
import { prisma } from "../../db/index";
import bcrypt from "bcryptjs";
import * as cookie from "cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

interface generateAccessTokenTypes {
  id: string;
  role: string | null;
}

const generateAccessToken = async ({ id, role }: generateAccessTokenTypes) => {
  return await jwt.sign({ userId: id, role: role }, `${JWT_SECRET}`, {
    expiresIn: "1h",
  });
};

const handler: Handler<"login"> = async (request, response) => {
  const { email, password } = request;

  // Input validation
  if (!email?.trim() || !password?.trim()) {
    throw Boom.badRequest("All Fields Are Required");
  }

  try {
    // Check for existing user
    const userExist = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!userExist) {
      throw Boom.notFound("User with given email not found!");
    }

    const checkPassword = await bcrypt.compare(password, userExist.password);
    console.log(checkPassword);
    if (!checkPassword) {
      throw Boom.unauthorized("Incorrect password");
    }

    const token = await generateAccessToken({
      id: userExist.id,
      role: userExist.role,
    });
    if (!token) {
      throw Boom.unauthorized("Failed to generate JWT token");
    }
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || false, // Ensure a valid boolean
      maxAge: 3600000, // 1 hour
    };

    console.log("Checking cookie module:", cookie); // Debugging

    return {
      success: true,
      status: 200,
      headers: {
        "Set-Cookie": cookie.serialize("token", token, cookieOptions),
      },
    };
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof Boom.Boom) {
      throw error;
    }

    throw Boom.internal("login failed!");
  }
};

export default handler;
