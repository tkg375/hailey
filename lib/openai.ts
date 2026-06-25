const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const EMBED_API_URL = "https://api.openai.com/v1/embeddings";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[], maxTokens = 512): Promise<string> {
  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json() as any;
  return data.choices[0]?.message?.content ?? "";
}

export async function createEmbedding(text: string, dimensions = 768): Promise<number[]> {
  const res = await fetch(EMBED_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text, dimensions }),
  });
  if (!res.ok) throw new Error(`OpenAI embed error: ${res.status} ${await res.text()}`);
  const data = await res.json() as any;
  return data.data[0]?.embedding ?? [];
}
