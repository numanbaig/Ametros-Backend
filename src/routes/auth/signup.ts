import { Handler } from "../../utils/make-api";
import Boom from "@hapi/boom";
import { prisma } from "../../db/index";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const handler: Handler<"signup"> = async (request) => {
  const { name, phone, password } = request;

  if (!name || !phone || !password) {
    throw Boom.badRequest("All Fields Are Required");
  }

  const existingUser = await prisma.user.findFirst({
    where: { phone, verified: true },
  });
  if (existingUser) {
    throw Boom.badRequest("User Already Exists For This Phone Number");
  }


  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      phone,
      verified: false,
      password: hashedPassword,
    },
  });

  return { success: true };
};

export default handler;
