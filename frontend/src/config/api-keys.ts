
// ============================================================================
// API Keys Configuration
// Keys are sourced from environment variables (.env.local / deployment config)
// Never commit API keys to source control
// ============================================================================

// API key must be provided via environment variable ANTHROPIC_API_KEY
// Do NOT hardcode keys in source — use .env.local for local development
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Helper to get API key from environment
export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY;
  return key || undefined;
}
