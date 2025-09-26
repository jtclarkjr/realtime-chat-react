import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withAuth } from '@/lib/auth/middleware'
import { roomCacheService } from '@/lib/services/room-cache-service'

interface GenerateRoomRequest {
  prompt?: string
  existingRoomNames?: string[]
}

interface GeneratedRoomSuggestion {
  name: string
  description: string
  reasoning?: string
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body: GenerateRoomRequest = await request.json()
    const { prompt, existingRoomNames = [] } = body

    // Initialize
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Anthropic API key not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Get existing rooms to avoid duplicates
    const existingRooms = await roomCacheService.getAllRooms()
    const allExistingNames = [
      ...existingRooms.map((room) => room.name.toLowerCase()),
      ...existingRoomNames.map((name) => name.toLowerCase())
    ]

    // Create system prompt for room generation
    const systemPrompt = `You are a helpful assistant that generates creative and appropriate chat room names and descriptions.

Guidelines:
- Generate unique, engaging room names that would work well in a chat application
- Names should be 8-30 characters long
- Descriptions should be brief (under 30 characters) and helpful
- Avoid existing room names: ${allExistingNames.join(', ')}
- Names should be professional but friendly
- Consider common chat room categories like: general discussion, greek alphabet, animals, etc
- Be creative but practical
Response format: You must respond with valid JSON only, no other text:
{
  "name": "room-name",
  "description": "Brief description"
}`

    // Create user prompt
    let userPrompt =
      'Generate a creative and unique chat room name with description.'

    if (prompt && prompt.trim()) {
      userPrompt = `Generate a chat room name and description based on this request: "${prompt.trim()}"`
    }

    // Add context about existing rooms
    if (allExistingNames.length > 0) {
      userPrompt += `\n\nExisting rooms to avoid duplicating: ${allExistingNames.join(', ')}`
    }

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 200,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    // Extract the response content
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from AI')
    }

    let suggestion: GeneratedRoomSuggestion
    try {
      suggestion = JSON.parse(content.text.trim())
    } catch {
      console.error('Failed to parse AI response:', content.text)
      // Fallback to a basic suggestion
      suggestion = {
        name: 'general-chat',
        description: 'General discussion room'
      }
    }

    // Validate the suggestion
    if (!suggestion.name || !suggestion.description) {
      throw new Error('AI response missing required fields')
    }

    // Ensure name length constraints
    if (suggestion.name.length < 2 || suggestion.name.length > 50) {
      suggestion.name = suggestion.name.substring(0, 50) || 'chat-room'
    }

    // Ensure description length constraints
    if (suggestion.description.length > 30) {
      suggestion.description = suggestion.description.substring(0, 27) + '...'
    }

    // Check if name already exists (case insensitive)
    const nameExists = allExistingNames.includes(suggestion.name.toLowerCase())
    if (nameExists) {
      // Add a number suffix to make it unique
      let counter = 1
      let newName = `${suggestion.name}-${counter}`
      while (
        allExistingNames.includes(newName.toLowerCase()) &&
        counter < 100
      ) {
        counter++
        newName = `${suggestion.name}-${counter}`
      }
      suggestion.name = newName
    }

    return NextResponse.json({
      suggestion: {
        name: suggestion.name,
        description: suggestion.description
      }
    })
  } catch (error) {
    console.error('Error generating room suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to generate room suggestion' },
      { status: 500 }
    )
  }
})
