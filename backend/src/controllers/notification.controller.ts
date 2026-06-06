import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

// Get user notifications (scoped by JWT user ID)
export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Auto-initialize some realistic sandbox notifications if the list is empty
    if (notifications.length === 0) {
      const role = req.user?.roleName;
      const mockNotifications = [];

      if (role === "PROCUREMENT_OFFICER" || role === "ADMIN") {
        mockNotifications.push(
          {
            userId,
            title: "New Quotation Bid Submitted",
            message: "Tata Steel Ltd has submitted a bid for RFQ-2026-0001.",
            type: "SUCCESS",
          },
          {
            userId,
            title: "RFQ Due Soon",
            message: "Office IT Equipment (RFQ-2026-0003) is closing in 24 hours.",
            type: "WARNING",
          }
        );
      } else if (role === "MANAGER") {
        mockNotifications.push(
          {
            userId,
            title: "Pending Purchase Approval",
            message: "Quotation QT-2026-0002 requires your authorization signature.",
            type: "INFO",
          },
          {
            userId,
            title: "Budget Cap Warning",
            message: "Monthly spend has reached 85% of department allocation.",
            type: "WARNING",
          }
        );
      } else if (role === "VENDOR") {
        mockNotifications.push(
          {
            userId,
            title: "New RFQ Assigned",
            message: "You have been assigned to bid for Heavy Machinery Lubricants (RFQ-2026-0004).",
            type: "INFO",
          },
          {
            userId,
            title: "Purchase Order Dispatched",
            message: "PO-2026-0001 has been sent to you. Please raise a billing invoice.",
            type: "SUCCESS",
          }
        );
      }

      if (mockNotifications.length > 0) {
        await prisma.notification.createMany({
          data: mockNotifications,
        });

        notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Mark notification as read
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.userId;

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Mark all notifications as read
export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
