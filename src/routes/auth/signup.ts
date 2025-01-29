import { Handler } from "../../utils/make-api";
import Boom from "@hapi/boom";
import { prisma } from "../../db/index";
import bcrypt from "bcryptjs";

const handler: Handler<"signup"> = async (request) => {
  const {
    firstName,
    lastName,
    email,
    password,
    registrationCode,
    role,
    acceptedTermsAndConditions,
  } = request;

  // Input validation
  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    !email?.trim() ||
    !password?.trim()
  ) {
    throw Boom.badRequest("All Fields Are Required");
  }

  try {
    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw Boom.conflict("User already exists with this email");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        registrationCode: registrationCode,
        role: role || "USER",
        acceptedTermsAndConditions: acceptedTermsAndConditions || false,
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    // Log the actual error for debugging
    console.error("Signup error:", error);

    // Proper error handling
    if (error instanceof Boom.Boom) {
      throw error;
    }
    throw Boom.internal("Failed to create user");
  }
};

export default handler;
