import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { getOrCreateConversation } from "@/lib/conversation"
import { prisma } from "@/lib/prisma"
import { ChatWindow } from "@/components/chat-window"

export default async function ChatPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  const conversation = await getOrCreateConversation(session.user.id)

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-700">{session.user.email}</p>
        <form
          action={async () => {
            "use server"
            await signOut()
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatWindow conversationId={conversation.id} initialMessages={messages} />
      </div>
    </div>
  )
}
