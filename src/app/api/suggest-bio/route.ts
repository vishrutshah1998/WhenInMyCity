import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>

    let prompt: string

    if (typeof body.brandName === 'string') {
      // Brand flow
      const { brandName, city, category, goals, audience, currentBio } = body as {
        brandName: string
        city: string
        category: string
        goals: string[]
        audience: string[]
        currentBio?: string
      }
      prompt = `Write a 2-3 sentence brand description for "${brandName}" in ${city}, India.
Category: ${category}
Goals: ${goals.join(', ')}
Target audience: ${audience.join(', ')}
${currentBio ? `Current draft: "${currentBio}"` : ''}
Brand voice only. No emojis. Max 150 characters. Return only the description text.`
    } else {
      // Venue flow
      const { venueName, city, types, amenities, events, currentBio } = body as {
        venueName: string
        city: string
        types: string[]
        amenities: string[]
        events: string[]
        currentBio?: string
      }
      prompt = `Write a 2-3 sentence venue bio for "${venueName}" in ${city}, India.
Venue type: ${types.join(', ')}
Amenities: ${amenities.slice(0, 6).join(', ')}
Preferred events: ${events.slice(0, 5).join(', ')}
${currentBio ? `Current bio draft: "${currentBio}"` : ''}
Write in a raw, urban, cultural voice. No emojis. Max 150 characters. Return only the bio text.`
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const suggestion = (message.content[0] as { type: 'text'; text: string }).text.trim()
    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('suggest-bio error:', error)
    return NextResponse.json({ suggestion: '' }, { status: 500 })
  }
}
