/**
 * Anthropic Claude LLM adapter.
 * BYO key: reads ANTHROPIC_API_KEY from env.
 * Never sends the key to the gateway or browser.
 */

import type { LLMProvider, ChatMessage } from "../index.js";

export interface AnthropicAdapterOptions {
  /** API key. Defaults to process.env.ANTHROPIC_API_KEY */
  apiKey?: string;
  /** Model. Defaults to claude-sonnet-4-6 */
  model?: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly model: string;
  private static readonly BASE_URL = "https://api.anthropic.com/v1";
  private static readonly API_VERSION = "2023-06-01";

  constructor(opts: AnthropicAdapterOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts.model ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
    this.id = `anthropic:${this.model}`;
  }

  async complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<string> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

    // Anthropic separates system messages from human/assistant turns
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");
    const system = systemMessages.map((m) => m.content).join("\n\n");

    const response = await fetch(`${AnthropicProvider.BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": AnthropicProvider.API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts?.maxTokens ?? 512,
        system: system || undefined,
        messages: conversationMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Anthropic API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  }
}
