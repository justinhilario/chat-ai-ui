import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (session) {
    redirect("/chat")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold">Chat with Anthropic's Claude Haiku 4.5!</h1>
      </header>
      <form
        action={async () => {
          "use server"
          await signIn("github", { redirectTo: "/chat" })
        }}
      >
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-foreground px-5 py-3 text-background transition-colors hover:bg-blue-600"
        >
          Sign in with GitHub
        </button>
      </form>
    </div>
  )
}
