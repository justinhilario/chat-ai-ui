import { anthropic, MODEL, MAX_TOKENS } from "@/lib/anthropic"

async function main() {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: "Reply with a short greeting." }],
  })

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")

  console.log(text)
}

main()
