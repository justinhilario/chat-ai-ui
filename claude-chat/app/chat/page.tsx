import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ChatPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return (
    <div>
      <p>{session.user.email}</p>
      <p>{session.user.id}</p>
    </div>
  )
}
