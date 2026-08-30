import { STOP_WORDS } from "../embeddings/local";
import { UNKNOWN_ANSWER_FALLBACK } from "../rag/prompt";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|day))\b/i,
  /^(who\s+are\s+you|what\s+can\s+you\s+do|how\s+can\s+you\s+help|help(\s+me)?)\b/i,
  /^(what\s+is\s+this\s+chatbot|how\s+to\s+use)\b/i,
];

function handleGreetingOrGeneralQuestion(query: string): string | null {
  const clean = query.trim().toLowerCase();

  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(clean)) {
      return (
        "👋 **Hello! I am your AI Campus Information Assistant.**\n\n" +
        "I can answer questions regarding official college policies, including:\n" +
        "• 📚 **Academics & Attendance:** Minimum attendance thresholds (75%), medical condonation (65%), grading system, and Degree with Honours.\n" +
        "• 🏠 **Hostel & Campus Life:** Curfew timings (9:30 PM / 10:00 PM), biometric attendance, night-out passes, and visitor regulations.\n" +
        "• 💰 **Fees & Scholarships:** Annual tuition installment deadlines, Presidential Scholar Award (50% waiver), and Dean's Fellowship.\n" +
        "• 💼 **Placements & Internships:** CGPA cutoffs (6.50), 'One Student One Job' policy, Dream Offer criteria ($15k+), and mandatory 8-week internships.\n\n" +
        "Feel free to ask any question or click one of the suggested prompts below!"
      );
    }
  }

  // Common general question patterns
  if (clean.includes("how to study") || clean.includes("study tips") || clean.includes("prepare for exam")) {
    return (
      "📖 **Exam Preparation & Study Advice for College Students:**\n\n" +
      "1. **Understand Evaluation Weightage:** Continuous Internal Assessments (CIA) typically count for 40%, and Semester End Exams (SEE) account for 60%.\n" +
      "2. **Maintain Attendance:** Ensure you maintain at least 75% attendance in theory and lab courses to remain eligible for examinations.\n" +
      "3. **Consult Official Syllabus:** Review course learning objectives and past examination papers available at the department library.\n" +
      "4. **Form Peer Study Groups:** Discuss lab concepts and problem-solving strategies in designated campus quiet study areas.\n\n" +
      "*Check the Academic Regulations document in the sources drawer for specific grading and exam rules.*"
    );
  }

  return null;
}

export function generateLocalLLMResponse(messages: LLMMessage[]): string {
  const userMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
  const systemMessage = messages.find((m) => m.role === "system")?.content || "";

  // 1. Check for conversational greetings or general assistant queries
  const greetingResponse = handleGreetingOrGeneralQuestion(userMessage);
  if (greetingResponse) {
    return greetingResponse;
  }

  // 2. Extract context from system message
  const contextMarker = "COLLEGE DOCUMENT CONTEXT:";
  const contextIndex = systemMessage.indexOf(contextMarker);

  if (contextIndex !== -1 && systemMessage.includes("[CHUNK")) {
    const contextText = systemMessage.substring(contextIndex + contextMarker.length);
    const normalizedQuery = userMessage.toLowerCase();

    // Parse chunks from context
    const chunkBlocks = contextText.split(/\[CHUNK\s+\d+\]/).filter((b) => b.trim().length > 0);

    if (chunkBlocks.length > 0) {
      const queryTokens = normalizedQuery
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

      const matchingLines: { text: string; score: number }[] = [];

      for (const block of chunkBlocks) {
        // Split block into paragraphs, list items, and clauses
        const rawSegments = block.split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z0-9])/);

        for (const segment of rawSegments) {
          const clean = segment.trim();
          if (clean.length < 15) continue;
          if (clean.startsWith("Source:") || clean.startsWith("[CHUNK") || clean.startsWith("COLLEGE DOCUMENT") || clean.startsWith("---")) continue;
          const contentOnly = clean.replace(/^[#\-*•\d.]+\s*/, "");
          const lower = contentOnly.toLowerCase();

          let matchCount = 0;
          for (const token of queryTokens) {
            if (lower.includes(token)) {
              matchCount += 2;
            }
          }

          // Check bigram / consecutive token matches
          for (let i = 0; i < queryTokens.length - 1; i++) {
            const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
            if (lower.includes(bigram)) {
              matchCount += 4;
            }
          }

          if (matchCount > 0) {
            matchingLines.push({ text: clean, score: matchCount });
          }
        }
      }

      if (matchingLines.length > 0) {
        matchingLines.sort((a, b) => b.score - a.score);

        const selected: string[] = [];
        for (const item of matchingLines) {
          const isDuplicate = selected.some(
            (s) => s.includes(item.text) || item.text.includes(s)
          );
          if (!isDuplicate) {
            selected.push(item.text);
          }
          if (selected.length >= 4) break;
        }

        const formattedItems = selected.map((s) => {
          const cleaned = s.replace(/^#+\s*/, "");
          return `• ${cleaned}`;
        });

        return (
          "According to the official college policy documents:\n\n" +
          formattedItems.join("\n\n") +
          "\n\n*Verified sources and document sections are listed in the sources drawer.*"
        );
      }
    }

    // Context was provided but had no matching answer
    return UNKNOWN_ANSWER_FALLBACK;
  }

  // 3. Fallback for open assistant queries without context
  return (
    `I searched the official college documentation for "${userMessage.trim()}", but couldn't find a direct policy match in the uploaded documents.\n\n` +
    `📌 **Tips to find what you're looking for:**\n` +
    `• You can ask about **attendance rules**, **curfew timings**, **tuition fees & scholarships**, or **placement criteria**.\n` +
    `• Administrators can upload additional PDF, Word (.docx), or Text documents in the **Admin Dashboard** to expand my knowledge base at any time!`
  );
}
