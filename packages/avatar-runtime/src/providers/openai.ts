/**
 * OpenAI-compatible LLM adapter.
 * BYO key: reads OPENAI_API_KEY (or OPENAI_BASE_URL for local/custom endpoints) from env.
 * Never sends the key to the gateway or browser.
 */

import type { LLMProvider, ChatMessage } from "../index.js";

export interface OpenAIAdapterOptions {
  /** API key. Defaults to process.env.OPENAI_API_KEY */
  apiKey?: string;
  /** Base URL. Defaults to https://api.openai.com/v1 */
  baseUrl?: string;
  /** Model. Defaults to gpt-4o-mini */
  model?: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(opts: OpenAIAdapterOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = (opts.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = opts.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.id = `openai:${this.model}`;
  }

  async complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<string> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not set.");
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: opts?.maxTokens ?? 512,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`OpenAI API error ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

/** OpenAI-compatible adapter for local models (Ollama, LM Studio, etc.) */
export class OpenAICompatibleProvider extends OpenAIProvider {
  constructor(opts: OpenAIAdapterOptions & { baseUrl: string }) {
    super(opts);
    Object.defineProperty(this, "id", { value: `openai-compatible:${opts.model ?? "local"}` });
  }
}
