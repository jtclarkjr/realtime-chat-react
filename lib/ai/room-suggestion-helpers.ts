import { ROOM_SUGGESTION_SYSTEM_PROMPT_TEMPLATE } from '@/lib/ai/constants'
import type { GeneratedRoomSuggestion } from './room-suggestion-parser'

export function buildFallbackSuggestion(
  currentName?: string,
  currentDescription?: string,
  prompt?: string
): GeneratedRoomSuggestion {
  const baseName =
    currentName?.trim() ||
    prompt
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30) ||
    'general-chat'

  const baseDescription =
    currentDescription?.trim() ||
    (prompt?.trim()
      ? `Discussion about ${prompt.trim().slice(0, 24)}`
      : 'Open conversation')

  return {
    name: baseName,
    description: baseDescription
  }
}

export function buildRoomSuggestionSystemPrompt(
  existingNames: string[]
): string {
  return ROOM_SUGGESTION_SYSTEM_PROMPT_TEMPLATE.replace(
    '{{EXISTING_NAMES}}',
    existingNames.join(', ')
  )
}

export function buildRoomSuggestionUserPrompt(
  currentName?: string,
  currentDescription?: string,
  prompt?: string,
  existingNames?: string[]
): string {
  const hasName = currentName?.trim()
  const hasDesc = currentDescription?.trim()

  let base = ''

  if (hasName || hasDesc) {
    base = [
      'Enhance the following room information:',
      hasName && `Name: "${hasName}"`,
      hasDesc && `Description: "${hasDesc}"`,
      '',
      'Generate an improved version staying close to the theme but more engaging.',
      !hasName && 'Create a name matching the description.',
      !hasDesc && 'Create a description matching the name.'
    ]
      .filter(Boolean)
      .join('\n')
  } else if (prompt?.trim()) {
    base = `Generate a chat room name and description based on: "${prompt.trim()}"`
  } else {
    base = 'Generate a creative and unique chat room name with description.'
  }

  if (existingNames?.length) {
    base += `\n\nAvoid duplicating: ${existingNames.join(', ')}`
  }

  return base
}

export function validateAndNormalizeRoomSuggestion(
  suggestion: GeneratedRoomSuggestion
): GeneratedRoomSuggestion {
  return {
    name:
      suggestion.name.length < 2 || suggestion.name.length > 50
        ? suggestion.name.substring(0, 50) || 'chat-room'
        : suggestion.name,
    description:
      suggestion.description.length > 30
        ? suggestion.description.substring(0, 27) + '...'
        : suggestion.description
  }
}

export function ensureUniqueRoomName(
  name: string,
  existingNames: string[]
): string {
  if (!existingNames.includes(name.toLowerCase())) return name

  for (let i = 1; i < 100; i++) {
    const newName = `${name}-${i}`
    if (!existingNames.includes(newName.toLowerCase())) return newName
  }
  return `${name}-${Date.now()}`
}
