import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withNonAnonymousAuth } from '@/lib/auth/middleware'
import { roomCacheService } from '@/lib/services/room/room-cache-service'
import { AI_STREAM_MODEL } from '@/lib/ai/constants'
import {
  parseAISuggestion,
  type GeneratedRoomSuggestion
} from '@/lib/ai/room-suggestion-parser'
import {
  buildFallbackSuggestion,
  buildRoomSuggestionSystemPrompt,
  buildRoomSuggestionUserPrompt,
  validateAndNormalizeRoomSuggestion,
  ensureUniqueRoomName
} from '@/lib/ai/room-suggestion-helpers'

interface GenerateRoomRequest {
  prompt?: string
  existingRoomNames?: string[]
  currentName?: string
  currentDescription?: string
}

export const POST = withNonAnonymousAuth(async (request: NextRequest) => {
  try {
    const {
      prompt,
      existingRoomNames = [],
      currentName,
      currentDescription
    } = (await request.json()) as GenerateRoomRequest

    let existingRooms: Array<{ name: string }> = []
    try {
      existingRooms = await roomCacheService.getAllRooms()
    } catch (cacheError) {
      console.error(
        'Failed to fetch room cache for room generation:',
        cacheError
      )
    }

    const allExistingNames = [
      ...existingRooms.map((room) => room.name.toLowerCase()),
      ...existingRoomNames.map((name) => name.toLowerCase())
    ]

    let generatedSuggestion: GeneratedRoomSuggestion | null = null
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (apiKey) {
      try {
        const anthropic = new Anthropic({ apiKey })
        const response = await anthropic.messages.create({
          model: AI_STREAM_MODEL,
          max_tokens: 200,
          system: buildRoomSuggestionSystemPrompt(allExistingNames),
          messages: [
            {
              role: 'user',
              content: buildRoomSuggestionUserPrompt(
                currentName,
                currentDescription,
                prompt,
                allExistingNames
              )
            }
          ]
        })

        const content = response.content[0]
        if (content.type === 'text') {
          const parsed = parseAISuggestion(content.text)
          generatedSuggestion = parsed.suggestion
          if (!generatedSuggestion && parsed.error) {
            console.warn('Failed to parse AI room suggestion:', parsed.error)
          }
        }
      } catch (aiError) {
        console.error(
          'Anthropic room suggestion failed, using fallback:',
          aiError
        )
      }
    }

    if (!generatedSuggestion) {
      generatedSuggestion = buildFallbackSuggestion(
        currentName,
        currentDescription,
        prompt
      )
    }

    const normalized = validateAndNormalizeRoomSuggestion(generatedSuggestion)
    const uniqueName = ensureUniqueRoomName(normalized.name, allExistingNames)

    return NextResponse.json(
      { suggestion: { name: uniqueName, description: normalized.description } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      }
    )
  } catch (error) {
    console.error('Error generating room suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to generate room suggestion' },
      { status: 500 }
    )
  }
})
