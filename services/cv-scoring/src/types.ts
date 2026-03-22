export interface ScoreRequest {
  filePath: string;
  originalName: string;
  mimeType: string;
}

export interface ScoreResponse {
  score: number;
  textExtracted: boolean;
  charCount: number;
  model: string;
  scoredAt: string;
}

export interface ErrorResponse {
  error: { code: string; message: string };
}
