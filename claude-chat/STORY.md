# STORY.md

Acceptance criteria. If a behavior is not described here, it is not in scope.

## Core story

As a signed-in user, I want to chat with Claude and have my conversation
saved, so I can close the tab and pick up where I left off.

---

## Sign in

As a visitor, I want to sign in with a single provider so I can reach my own
chat history.

- The homepage renders a sign-in button when I am signed out
- Signing in redirects me to GitHub and back
- I land on `/chat`, not the homepage
- Visiting `/chat` while signed out redirects me to sign in rather than
  rendering an empty page
- A `User` row exists in Postgres after my first sign-in
- A `Conversation` row owned by me exists after my first visit to `/chat`, and
  visiting again does not create a second one

## Send a message

As a signed-in user, I want to type a message and get a reply from Claude.

- My message appears in the thread
- The assistant reply appears below it
- Both rows are written to `Message`, under a `Conversation` whose `userId` is
  mine. `Message` itself carries no user id; ownership runs through the
  conversation
- The Anthropic call happens in a route handler, never in the browser
- The input is disabled while a request is in flight, and looks disabled
- If the provider call fails, I see an error and can send again. My message
  stays in the thread with no reply attached to it

## See my history

As a returning user, I want my past messages loaded when I open the app.

- Messages render oldest to newest on page load
- A hard refresh shows the same thread in the same order
- I only ever see messages belonging to a conversation I own. Passing someone
  else's conversation id to the API returns 404, not their messages

## Sign out

As a signed-in user, I want to log out so my chat is not visible to whoever
uses this machine next.

- A persistent header shows my email and a sign-out button on every signed-in
  page
- Signing out clears the session
- `/chat` then redirects to sign in
