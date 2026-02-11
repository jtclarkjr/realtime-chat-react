export const AI_STREAM_MODEL = 'claude-haiku-4-5'
export const AI_STREAM_CODE_MODEL = 'claude-sonnet-4-5'

export const LANGUAGE_HINTS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c#',
  'c++',
  'go',
  'golang',
  'rust',
  'php',
  'ruby',
  'sql',
  'html',
  'css',
  'bash',
  'shell',
  'node',
  'react',
  'nextjs',
  'next.js'
]

export const ACTION_HINTS = [
  'write code',
  'write a function',
  'create function',
  'generate code',
  'generate script',
  'implement',
  'refactor',
  'debug',
  'fix bug',
  'fix this error',
  'add unit test',
  'show code',
  'provide code'
]

export const CONCEPT_ONLY_HINTS = [
  'explain',
  'what is',
  'overview',
  'summary',
  'summarize',
  'high level',
  'without code',
  'no code'
]

export const CODE_PATTERN_REGEXES = [
  /```[\s\S]*```/i,
  /\bfunction\s+[a-zA-Z_$]/,
  /\bclass\s+[A-Z][a-zA-Z0-9_]*/,
  /\b(import|export)\s+/,
  /\b(const|let|var)\s+[a-zA-Z_$]/,
  /\bTraceback \(most recent call last\)/,
  /\bTypeError:|\bReferenceError:|\bSyntaxError:/i
]

export const WEB_SEARCH_TOOL_NAME = 'web_search'
export const WEB_SEARCH_TOOL_DESCRIPTION =
  'Search the public web for current and time-sensitive information. Use concise, specific queries.'
export const WEB_SEARCH_QUERY_FIELD_DESCRIPTION =
  'The exact search query to run on the web.'

export const CURRENT_TIME_CONTEXT_TEMPLATE = `CURRENT TIME CONTEXT:
- Current date/time (UTC ISO): {{NOW_ISO}}
- Current date/time (UTC text): {{NOW_UTC}}
- Interpret relative dates like "today", "yesterday", and "last week" against this timestamp.
- Prefer the newest reliable sources and state absolute dates for release/news claims.`

export const ROOM_SUGGESTION_SYSTEM_PROMPT_TEMPLATE = `You are a helpful assistant that generates creative and appropriate chat room names and descriptions.

Guidelines:
- Generate unique, engaging room names that would work well in a chat application
- Names should be 8-30 characters long
- Descriptions should be brief (under 30 characters) and helpful
- Avoid existing room names: {{EXISTING_NAMES}}
- Names should be professional but friendly
- Consider common chat room categories like: general discussion, greek alphabet, animals, etc
- Be creative but practical
Response format: You must respond with valid JSON only, no other text:
{
  "name": "room-name",
  "description": "Brief description"
}`
