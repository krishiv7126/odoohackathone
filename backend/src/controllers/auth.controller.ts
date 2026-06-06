import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { createActivityLog } from "../services/log.service";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-vendorbridge-jwt-token-key-2026";

// Login controller
export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        vendor: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials or inactive account" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleName: user.role.name,
        roleId: user.role.id,
        vendorId: user.vendor?.id || null,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Automated Audit Log for User Login
    await createActivityLog(
      user.id,
      "USER_LOGIN",
      "USER",
      user.id,
      req.ip,
      `User ${user.firstName} ${user.lastName} (${user.role.name}) logged in.`
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleName: user.role.name,
        vendorId: user.vendor?.id || null,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Register controller (Admin only)
export async function register(req: AuthenticatedRequest, res: Response) {
  const { email, password, firstName, lastName, roleName } = req.body;

  if (!email || !password || !firstName || !lastName || !roleName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: role.id,
        isActive: true,
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Get Profile controller
export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: true,
        vendor: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleName: user.role.name,
        vendorId: user.vendor?.id || null,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Logout controller (For logging purposes)
export async function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    // Automated Audit Log for User Logout
    await createActivityLog(
      req.user.userId,
      "USER_LOGOUT",
      "USER",
      req.user.userId,
      req.ip,
      `User ${req.user.email} logged out.`
    );
  }

  return res.status(200).json({ message: "Logged out successfully" });
}
