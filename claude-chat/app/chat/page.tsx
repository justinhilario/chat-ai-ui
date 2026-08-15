import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getOrCreateConversation } from "@/lib/conversation"

export default async function ChatPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  const conversation = await getOrCreateConversation(session.user.id)

  return (
    <div>
      <p>{session.user.email}</p>
      <p>{session.user.id}</p>
      <p>{conversation.id}</p>
    </div>
  )
}
