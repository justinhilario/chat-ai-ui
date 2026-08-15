import { auth, signIn, signOut } from "@/auth"

export default async function Home() {
  const session = await auth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {session ? (
        <form
          action={async () => {
            "use server"
            await signOut()
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-3 text-background"
          >
            Sign out
          </button>
        </form>
      ) : (
        <form
          action={async () => {
            "use server"
            await signIn("github", { redirectTo: "/chat" })
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-3 text-background"
          >
            Sign in with GitHub
          </button>
        </form>
      )}
    </div>
  )
}
