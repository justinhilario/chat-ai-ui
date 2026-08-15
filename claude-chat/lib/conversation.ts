import { prisma } from "@/lib/prisma"

export async function getOrCreateConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({ where: { userId } })
  if (existing) return existing

  return prisma.conversation.create({ data: { userId } })
}
