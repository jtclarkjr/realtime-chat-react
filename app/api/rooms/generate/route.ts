import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withNonAnonymousAuth } from '@/lib/auth/middleware'
import { roomCacheService } from '@/lib/services/room/room-cache-service'

interface GenerateRoomRequest {
  prompt?: string
  existingRoomNames?: string[]
  currentName?: string
  currentDescription?: string
}

interface GeneratedRoomSuggestion {
  name: string
  description: string
}

function buildSystemPrompt(existingNames: string[]): string {
  return `You are a helpful assistant that generates creative and appropriate chat room names and descriptions.

Guidelines:
- Generate unique, engaging room names that would work well in a chat application
- Names should be 8-30 characters long
- Descriptions should be brief (under 30 characters) and helpful
- Avoid existing room names: ${existingNames.join(', ')}
- Names should be professional but friendly
- Consider common chat room categories like: general discussion, greek alphabet, animals, etc
- Be creative but practical
Response format: You must respond with valid JSON only, no other text:
{
  "name": "room-name",
  "description": "Brief description"
}`
}

function buildUserPrompt(
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

function validateAndNormalize(
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

function ensureUniqueName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name.toLowerCase())) return name

  for (let i = 1; i < 100; i++) {
    const newName = `${name}-${i}`
    if (!existingNames.includes(newName.toLowerCase())) return newName
  }
  return `${name}-${Date.now()}`
}

export const POST = withNonAnonymousAuth(async (request: NextRequest) => {
  try {
    const {
      prompt,
      existingRoomNames = [],
      currentName,
      currentDescription
    } = (await request.json()) as GenerateRoomRequest

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const existingRooms = await roomCacheService.getAllRooms()
    const allExistingNames = [
      ...existingRooms.map((room) => room.name.toLowerCase()),
      ...existingRoomNames.map((name) => name.toLowerCase())
    ]

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 200,
      system: buildSystemPrompt(allExistingNames),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(
            currentName,
            currentDescription,
            prompt,
            allExistingNames
          )
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI')
    }

    const parsed = JSON.parse(content.text.trim()) as GeneratedRoomSuggestion
    if (!parsed.name || !parsed.description) {
      throw new Error('AI response missing required fields')
    }

    const normalized = validateAndNormalize(parsed)
    const uniqueName = ensureUniqueName(normalized.name, allExistingNames)

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
