import prisma from "../config/db";

export async function createActivityLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  ipAddress: string | null = null,
  details: string | null = null
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}
