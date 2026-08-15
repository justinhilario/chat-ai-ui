"use client"

import { useEffect, useRef, useState } from "react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatWindowProps = {
  conversationId: string
  initialMessages: Message[]
}

export function ChatWindow({ conversationId, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  async function handleSubmit() {
    const content = input.trim()
    if (!content || pending) return

    setError(null)
    setInput("")
    setPending(true)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      })

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`)
      }

      const data: { reply: string } = await res.json()
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply },
      ])
    } catch {
      setError("Something went wrong sending that message. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md pt-12 text-center text-sm text-gray-500">
            No messages yet. Say something to start the conversation.
          </p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-md whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="mx-auto w-full max-w-2xl px-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            disabled={pending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit()
            }}
            placeholder="Type a message"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="button"
            disabled={pending}
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}
