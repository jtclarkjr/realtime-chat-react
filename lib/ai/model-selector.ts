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

const normalize = (value: string) => value.toLowerCase()

const includesAny = (text: string, hints: string[]) =>
  hints.some((hint) => text.includes(hint))

export const shouldUseCodeModel = ({
  message,
  customPrompt,
  targetMessageContent
}: ModelSelectorInput): boolean => {
  const fullText = [message, customPrompt, targetMessageContent]
    .filter(Boolean)
    .join('\n')
    .trim()

  if (!fullText) return false

  const normalized = normalize(fullText)
  const hasCodePattern = CODE_PATTERN_REGEXES.some((regex) =>
    regex.test(fullText)
  )
  const hasActionHint = includesAny(normalized, ACTION_HINTS)
  const hasLanguageHint = includesAny(normalized, LANGUAGE_HINTS)
  const hasConceptOnly = includesAny(normalized, CONCEPT_ONLY_HINTS)

  if (hasCodePattern) return true
  if (hasActionHint && (hasLanguageHint || normalized.includes('code'))) {
    return true
  }

  if (hasConceptOnly && !hasActionHint) return false

  return false
}

const getConfiguredModel = (
  value: string | undefined,
  fallback: string
): string => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export const resolveAIModel = (input: ModelSelectorInput): string => {
  const defaultModel = getConfiguredModel(
    process.env.AI_STREAM_DEFAULT_MODEL,
    AI_STREAM_MODEL
  )
  const codeModel = getConfiguredModel(
    process.env.AI_STREAM_CODE_MODEL,
    AI_STREAM_CODE_MODEL
  )

  if (shouldUseCodeModel(input)) {
    return codeModel
  }

  return defaultModel
}
