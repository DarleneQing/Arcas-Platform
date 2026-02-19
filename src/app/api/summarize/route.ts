import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  short: 'Provide a very concise summary in 2-3 sentences.',
  medium: 'Provide a summary in one well-structured paragraph.',
  long: 'Provide a comprehensive summary with multiple paragraphs covering all key points. Use bullet points where appropriate.',
};

export async function POST(req: NextRequest) {
  try {
    const { text, length } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: 'API key not configured. Please set OPENAI_API_KEY in your .env.local file.', code: 'MISSING_API_KEY' } },
        { status: 401 }
      );
    }

    const lengthInstruction = LENGTH_INSTRUCTIONS[length] || LENGTH_INSTRUCTIONS.medium;

    const prompt = `You are an expert summarizer. Summarize the following text.

${lengthInstruction}

Focus on the most important information and key takeaways. Maintain accuracy and do not add information not present in the original text.

Text to summarize:
---
${text}
---

Summary:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error('Summarize API error:', error);

    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { error: { message: 'Too many requests. Please wait a moment before trying again.', code: 'RATE_LIMITED' } },
        { status: 429 }
      );
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: { message: 'Invalid API key. Please check your OPENAI_API_KEY in .env.local.', code: 'INVALID_API_KEY' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { message: 'Failed to summarize. Please try again.', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
