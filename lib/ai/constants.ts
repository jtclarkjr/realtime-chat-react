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
