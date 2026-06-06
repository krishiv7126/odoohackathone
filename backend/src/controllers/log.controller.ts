import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// Get activity logs (Admin only)
export async function getActivityLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
