import { anthropic, MODEL, MAX_TOKENS, SYSTEM_PROMPT } from "@/lib/anthropic"

async function main() {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: "Say hello in five words." }],
  })

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")

  console.log(text)
}

main()
