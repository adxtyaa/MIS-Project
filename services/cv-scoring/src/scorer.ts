import fs from "fs";
import pdfParse from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";
import { ScoreRequest, ScoreResponse } from "./types";
import { SCORING_SYSTEM_PROMPT, buildScoringMessage } from "./prompt";

const anthropic = new Anthropic();

export async function scoreCV(request: ScoreRequest): Promise<ScoreResponse> {
  const model = process.env.SCORING_MODEL || "claude-sonnet-4-20250514";
  const maxChars = parseInt(process.env.MAX_CV_CHARS || "8000", 10);

  try {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(request.filePath);
    const pdfData = await pdfParse(dataBuffer);
    const cvText = pdfData.text.trim();

    // If text < 50 chars: unreadable PDF
    if (cvText.length < 50) {
      console.log(`[scorer] PDF unreadable (${cvText.length} chars): ${request.originalName}`);
      return {
        score: 0.5,
        textExtracted: false,
        charCount: cvText.length,
        model,
        scoredAt: new Date().toISOString(),
      };
    }

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model,
      max_tokens: 50,
      system: SCORING_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildScoringMessage(cvText, maxChars) },
      ],
    });

    // Parse score from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(responseText);
    let score = parseFloat(parsed.score);

    // Validate and clamp
    if (isNaN(score) || score < 0) score = 0;
    if (score > 5) score = 5;
    score = Math.round(score * 10) / 10;

    console.log(`[scorer] Scored ${request.originalName}: ${score} (${cvText.length} chars)`);

    return {
      score,
      textExtracted: true,
      charCount: cvText.length,
      model,
      scoredAt: new Date().toISOString(),
    };
  } catch (err: any) {
    // On Claude API error: log and return fallback score
    console.error(`[scorer] Error scoring ${request.originalName}:`, err.message || err);
    return {
      score: 1.0,
      textExtracted: true,
      charCount: 0,
      model,
      scoredAt: new Date().toISOString(),
    };
  } finally {
    // Always clean up temp file
    try {
      if (fs.existsSync(request.filePath)) {
        fs.unlinkSync(request.filePath);
      }
    } catch (cleanupErr) {
      console.error(`[scorer] Failed to delete temp file ${request.filePath}:`, cleanupErr);
    }
  }
}
