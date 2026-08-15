import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { anthropic, MODEL, MAX_TOKENS, SYSTEM_PROMPT } from "@/lib/anthropic"

const bodySchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(10000),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { conversationId, content } = parsed.data

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.message.create({
    data: { conversationId, role: "user", content },
  })

  const thread = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  const messages = thread.map((m) => ({ role: m.role, content: m.content }))

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
  })

  const reply = res.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")

  await prisma.message.create({
    data: { conversationId, role: "assistant", content: reply },
  })

  return NextResponse.json({ reply })
}
