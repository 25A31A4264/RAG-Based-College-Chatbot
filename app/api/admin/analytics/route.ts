import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalDocuments,
      readyDocuments,
      failedDocuments,
      totalChunks,
      totalConversations,
      totalMessages,
      totalFeedbacks,
      upFeedbacks,
      downFeedbacks,
      categoriesGroup,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { status: "READY" } }),
      prisma.document.count({ where: { status: "FAILED" } }),
      prisma.documentChunk.count(),
      prisma.conversation.count(),
      prisma.message.count({ where: { role: "USER" } }),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { rating: "UP" } }),
      prisma.feedback.count({ where: { rating: "DOWN" } }),
      prisma.document.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
    ]);

    const satisfactionRate =
      totalFeedbacks > 0 ? Math.round((upFeedbacks / totalFeedbacks) * 100) : 100;

    return NextResponse.json({
      analytics: {
        totalDocuments,
        readyDocuments,
        failedDocuments,
        totalChunks,
        totalConversations,
        totalQuestionsAsked: totalMessages,
        feedback: {
          total: totalFeedbacks,
          up: upFeedbacks,
          down: downFeedbacks,
          satisfactionRate,
        },
        categoryDistribution: categoriesGroup.map((c) => ({
          category: c.category,
          count: c._count.id,
        })),
      },
    });
  } catch (error: any) {
    const isAuth = error.message?.includes("Unauthorized") || error.message?.includes("Forbidden");
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: isAuth ? 403 : 500 }
    );
  }
}
