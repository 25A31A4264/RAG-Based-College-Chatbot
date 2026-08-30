import { prisma } from "@/lib/db/prisma";
import { cosineSimilarity, computeLocalRelevanceScore } from "@/lib/embeddings/local";
import { RetrievedChunkContext } from "./prompt";

export interface VectorSearchParams {
  queryEmbedding: number[];
  queryText?: string;
  topK?: number;
  minScore?: number;
  category?: string;
}

/**
 * Searches the PostgreSQL pgvector database or local vector store for the most relevant document chunks.
 * Seamlessly supports PostgreSQL + pgvector as well as SQLite local development.
 */
export async function searchSimilarChunks(
  params: VectorSearchParams
): Promise<RetrievedChunkContext[]> {
  const topK =
    params.topK ||
    parseInt(process.env.RAG_TOP_K || "5", 10);
  const minScore =
    params.minScore !== undefined
      ? params.minScore
      : parseFloat(process.env.MIN_RELEVANCE_SCORE || "0.70");

  const isPostgres = process.env.DATABASE_URL?.startsWith("postgres");

  if (isPostgres && typeof (prisma as any).$queryRawUnsafe === "function") {
    try {
      const embeddingStr = `[${params.queryEmbedding.join(",")}]`;
      const rawResults: any[] = await (prisma as any).$queryRawUnsafe(`
        SELECT 
          dc.id,
          dc."documentId",
          dc.content,
          dc."chunkIndex",
          dc."pageNumber",
          dc."sectionTitle",
          d.title as "documentTitle",
          d.category,
          1 - (dc.embedding <=> '${embeddingStr}'::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON d.id = dc."documentId"
        WHERE d.status = 'READY'
          AND dc.embedding IS NOT NULL
          ${params.category ? `AND d.category = '${params.category}'` : ""}
        ORDER BY similarity DESC
        LIMIT ${topK * 2};
      `);

      if (rawResults && rawResults.length > 0) {
        const filtered = rawResults
          .filter((r) => Number(r.similarity) >= minScore)
          .slice(0, topK)
          .map((r) => ({
            id: r.id,
            documentTitle: r.documentTitle,
            category: r.category,
            pageNumber: r.pageNumber,
            sectionTitle: r.sectionTitle,
            content: r.content,
            score: Number(r.similarity),
          }));

        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch {
      // Fallback to application-layer retrieval
    }
  }

  // 2. High-speed application layer retrieval: Query READY document chunks
  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        status: "READY",
        ...(params.category ? { category: params.category } : {}),
      },
    },
    include: {
      document: {
        select: {
          title: true,
          category: true,
        },
      },
    },
  });

  const scoredChunks: RetrievedChunkContext[] = [];

  for (const chunk of chunks) {
    let score = 0;

    if (params.queryText) {
      const localRelScore = computeLocalRelevanceScore(
        params.queryText,
        chunk.content,
        chunk.document.title,
        chunk.sectionTitle || ""
      );
      score = Math.max(score, localRelScore);
    }

    if (chunk.vectorJson) {
      try {
        const chunkVector: number[] = JSON.parse(chunk.vectorJson);
        const cosScore = cosineSimilarity(params.queryEmbedding, chunkVector);
        score = Math.max(score, cosScore);
      } catch {
        // ignore invalid vector JSON
      }
    }

    if (score >= minScore) {
      scoredChunks.push({
        id: chunk.id,
        documentTitle: chunk.document.title,
        category: chunk.document.category,
        pageNumber: chunk.pageNumber,
        sectionTitle: chunk.sectionTitle,
        content: chunk.content,
        score,
      });
    }
  }

  // Sort descending by similarity score and take topK
  scoredChunks.sort((a, b) => b.score - a.score);
  return scoredChunks.slice(0, topK);
}
