export interface GeneratedRoomSuggestion {
  name: string
  description: string
}

export function parseJSONWithError<T>(value: string): {
  data: T | null
  error: string | null
} {
  try {
    return { data: JSON.parse(value) as T, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown JSON parse error'
    }
  }
}

function toSuggestion(
  value: Partial<GeneratedRoomSuggestion> | null
): GeneratedRoomSuggestion | null {
  if (
    value &&
    typeof value.name === 'string' &&
    typeof value.description === 'string'
  ) {
    return { name: value.name, description: value.description }
  }
  return null
}

export function parseAISuggestion(rawText: string): {
  suggestion: GeneratedRoomSuggestion | null
  error: string | null
} {
  const trimmed = rawText.trim()
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const direct =
    parseJSONWithError<Partial<GeneratedRoomSuggestion>>(withoutFences)
  const directSuggestion = toSuggestion(direct.data)
  if (directSuggestion) {
    return { suggestion: directSuggestion, error: null }
  }

  const jsonMatch = withoutFences.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { suggestion: null, error: direct.error || 'No JSON object found' }
  }

  const extracted = parseJSONWithError<Partial<GeneratedRoomSuggestion>>(
    jsonMatch[0]
  )
  const extractedSuggestion = toSuggestion(extracted.data)
  if (extractedSuggestion) {
    return { suggestion: extractedSuggestion, error: null }
  }

  return {
    suggestion: null,
    error: extracted.error || direct.error || 'Invalid AI suggestion format'
  }
}
