import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genai.getGenerativeModel({ model: "text-embedding-004" });

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((text) => embeddingModel.embedContent(text))
  );
  return results.map((r) => r.embedding.values);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom ? dot / denom : 0;
}
