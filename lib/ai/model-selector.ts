import {
  ACTION_HINTS,
  AI_STREAM_CODE_MODEL,
  AI_STREAM_MODEL,
  CODE_PATTERN_REGEXES,
  CONCEPT_ONLY_HINTS,
  LANGUAGE_HINTS
} from '@/lib/ai/constants'

interface ModelSelectorInput {
  message: string
  customPrompt?: string
  targetMessageContent?: string
  responseFormat?: 'plain' | 'markdown'
}

const ALLOWED_AI_MODELS = new Set<string>([
  AI_STREAM_MODEL,
  AI_STREAM_CODE_MODEL,
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
])

const normalize = (value: string) => value.toLowerCase()

const includesAny = (text: string, hints: string[]) =>
  hints.some((hint) => text.includes(hint))

export const shouldUseCodeModel = ({
  message,
  customPrompt,
  targetMessageContent
}: ModelSelectorInput): boolean => {
  const instructionText = [message, customPrompt]
    .filter(Boolean)
    .join('\n')
    .trim()
  const contextText = (targetMessageContent || '').trim()

  if (!instructionText && !contextText) return false

  const normalizedInstruction = normalize(instructionText)
  const hasCodePatternInInstruction = CODE_PATTERN_REGEXES.some((regex) =>
    regex.test(instructionText)
  )
  const hasCodePatternInContext = CODE_PATTERN_REGEXES.some((regex) =>
    regex.test(contextText)
  )
  const hasActionHint = includesAny(normalizedInstruction, ACTION_HINTS)
  const hasLanguageHint = includesAny(normalizedInstruction, LANGUAGE_HINTS)
  const hasConceptOnly = includesAny(normalizedInstruction, CONCEPT_ONLY_HINTS)

  if (hasCodePatternInInstruction) return true
  if (
    hasActionHint &&
    (hasLanguageHint ||
      normalizedInstruction.includes('code') ||
      hasCodePatternInContext)
  ) {
    return true
  }

  if (hasConceptOnly && !hasActionHint) return false

  return false
}

const getConfiguredModel = (
  envKey: string,
  value: string | undefined,
  fallback: string
): string => {
  const trimmed = value?.trim()
  if (!trimmed) return fallback

  if (!ALLOWED_AI_MODELS.has(trimmed)) {
    console.warn(`Invalid ${envKey} value "${trimmed}", falling back to ${fallback}`)
    return fallback
  }

  return trimmed
}

export const resolveAIModel = (input: ModelSelectorInput): string => {
  const defaultModel = getConfiguredModel(
    'AI_STREAM_DEFAULT_MODEL',
    process.env.AI_STREAM_DEFAULT_MODEL,
    AI_STREAM_MODEL
  )
  const codeModel = getConfiguredModel(
    'AI_STREAM_CODE_MODEL',
    process.env.AI_STREAM_CODE_MODEL,
    AI_STREAM_CODE_MODEL
  )

  if (shouldUseCodeModel(input)) {
    return codeModel
  }

  return defaultModel
}
