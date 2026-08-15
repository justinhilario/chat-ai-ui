import Anthropic from "@anthropic-ai/sdk"
import { env } from "@/lib/env"

export const MODEL = "claude-haiku-4-5-20251001"
export const MAX_TOKENS = 1024
export const SYSTEM_PROMPT =
  "You are a helpful assistant that keeps its responses concise."

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})
