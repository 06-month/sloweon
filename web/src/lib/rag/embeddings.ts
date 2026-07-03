import {
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_OPENAI_EMBEDDING_MODEL,
} from "./constants";

export type EmbeddingProvider = "openai" | "gemini";

export type EmbeddingErrorCode =
  | "EMBEDDING_API_KEY_MISSING"
  | "EMBEDDING_PROVIDER_INVALID"
  | "EMBEDDING_RATE_LIMIT"
  | "EMBEDDING_REQUEST_FAILED"
  | "EMBEDDING_RESPONSE_INVALID";

export class EmbeddingError extends Error {
  constructor(
    public readonly errorCode: EmbeddingErrorCode,
    message?: string
  ) {
    super(message || errorCode);
    this.name = "EmbeddingError";
  }
}

export function getEmbeddingConfig() {
  const raw = process.env.EMBEDDING_PROVIDER || DEFAULT_EMBEDDING_PROVIDER;
  const provider: EmbeddingProvider = raw === "gemini" ? "gemini" : "openai";
  const openAiModel =
    process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;
  const geminiModel =
    process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL;
  return { provider, openAiModel, geminiModel };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { provider } = getEmbeddingConfig();
  const input = text.slice(0, 8000);

  try {
    if (provider === "gemini") {
      return await generateGeminiEmbedding(input);
    }
    return await generateOpenAiEmbedding(input);
  } catch (err) {
    if (err instanceof EmbeddingError) throw err;
    throw new EmbeddingError("EMBEDDING_REQUEST_FAILED");
  }
}

async function generateOpenAiEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError("EMBEDDING_API_KEY_MISSING");
  }

  const model =
    process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_EMBEDDING_MODEL;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (response.status === 429) {
    throw new EmbeddingError("EMBEDDING_RATE_LIMIT");
  }

  if (!response.ok) {
    throw new EmbeddingError("EMBEDDING_REQUEST_FAILED");
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new EmbeddingError("EMBEDDING_RESPONSE_INVALID");
  }
  return embedding;
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError("EMBEDDING_API_KEY_MISSING");
  }

  const model =
    process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      }),
    }
  );

  if (response.status === 429) {
    throw new EmbeddingError("EMBEDDING_RATE_LIMIT");
  }

  if (!response.ok) {
    throw new EmbeddingError("EMBEDDING_REQUEST_FAILED");
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new EmbeddingError("EMBEDDING_RESPONSE_INVALID");
  }
  return values;
}
