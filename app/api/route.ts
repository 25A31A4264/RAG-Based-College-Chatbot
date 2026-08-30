import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "College RAG Chatbot API",
    version: "1.0.0",
    description: "Backend API for Retrieval-Augmented Generation (RAG) Campus Assistant",
    database: "MongoDB Atlas",
    endpoints: {
      chat: "/api/chat",
      auth: "/api/auth",
      conversations: "/api/conversations",
      feedback: "/api/feedback",
      admin: {
        documents: "/api/admin/documents",
        analytics: "/api/admin/analytics",
      },
    },
    timestamp: new Date().toISOString(),
  });
}
