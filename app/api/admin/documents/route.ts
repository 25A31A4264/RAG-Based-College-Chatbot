import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { saveUploadedFile } from "@/lib/storage/storage";
import { extractAndProcessDocument } from "@/lib/documents/extractor";
import { generateEmbedding } from "@/lib/embeddings/provider";

export const maxDuration = 60; // Support up to 60 seconds processing for larger docs

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const documents = await prisma.document.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json({ documents });
  } catch (error: any) {
    const isAuth = error.message?.includes("Unauthorized") || error.message?.includes("Forbidden");
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: isAuth ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "General";
    const customTitle = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No document file provided" }, { status: 400 });
    }

    // 1. Validate file size (15MB max)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 15MB maximum size limit" },
        { status: 400 }
      );
    }

    // 2. Validate format
    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "docx", "txt", "md", "markdown"].includes(ext)) {
      return NextResponse.json(
        { error: "Unsupported format. Only PDF, DOCX, TXT, and Markdown files are supported." },
        { status: 400 }
      );
    }

    // 3. Save file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stored = await saveUploadedFile(buffer, fileName);

    const docTitle = customTitle?.trim() || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    // 4. Create document in database with status PROCESSING
    const document = await prisma.document.create({
      data: {
        title: docTitle,
        fileName,
        fileType: ext.toUpperCase(),
        fileSize: stored.fileSize,
        filePath: stored.filePath,
        category,
        status: "PROCESSING",
      },
    });

    // 5. Ingestion pipeline: Text extraction & chunking
    try {
      const extraction = await extractAndProcessDocument(buffer, fileName);

      if (extraction.chunks.length === 0) {
        throw new Error("No readable text could be extracted from this document");
      }

      // Generate embeddings and persist chunks
      for (const chunk of extraction.chunks) {
        const embedding = await generateEmbedding(chunk.content);
        const vectorJson = JSON.stringify(embedding);

        const createdChunk = await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            sectionTitle: chunk.sectionTitle,
            tokenCount: chunk.tokenCount,
            vectorJson,
          },
        });


      }

      // 6. Mark document READY
      const updatedDoc = await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "READY",
          metadata: JSON.stringify({
            pageCount: extraction.pageCount,
            chunkCount: extraction.chunks.length,
            extractedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json(
        {
          message: "Document uploaded and processed successfully",
          document: updatedDoc,
          chunksProcessed: extraction.chunks.length,
        },
        { status: 201 }
      );
    } catch (ingestErr: any) {
      console.error("Document ingestion pipeline error:", ingestErr);

      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: "FAILED",
          errorMessage: ingestErr.message || "Failed to process document",
        },
      });

      return NextResponse.json(
        { error: `Document ingestion failed: ${ingestErr.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Document upload API error:", error);
    const isAuth = error.message?.includes("Unauthorized") || error.message?.includes("Forbidden");
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: isAuth ? 403 : 500 }
    );
  }
}
