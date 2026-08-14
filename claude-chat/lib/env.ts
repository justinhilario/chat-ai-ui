function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  DIRECT_URL: required("DIRECT_URL"),
  AUTH_SECRET: required("AUTH_SECRET"),
  AUTH_GITHUB_ID: required("AUTH_GITHUB_ID"),
  AUTH_GITHUB_SECRET: required("AUTH_GITHUB_SECRET"),
  ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY"),
}
