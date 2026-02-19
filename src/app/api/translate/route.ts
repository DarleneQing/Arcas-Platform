import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage, domain } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: 'API key not configured. Please set OPENAI_API_KEY in your .env.local file.', code: 'MISSING_API_KEY' } },
        { status: 401 }
      );
    }

    const detectStep = sourceLanguage
      ? `The source language is ${sourceLanguage}.`
      : 'Detect the language of the input text.';
    const domainHint = domain && String(domain).trim()
      ? ` Use terminology and style appropriate for the following domain/industry/field: ${String(domain).trim()}.`
      : '';
    const prompt = `You are a professional translator.${domainHint} Perform the following tasks:

1. ${detectStep}
2. Translate the text into ${targetLanguage}.

Input text:
"${text}"

Respond in this exact JSON format (no markdown, no code blocks):
{"detectedLanguage": "Language Name", "translation": "translated text here"}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (completion.choices[0]?.message?.content || '').trim();

    // Try to parse JSON response
    try {
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        translation: parsed.translation,
        detectedLanguage: sourceLanguage || parsed.detectedLanguage,
      });
    } catch {
      return NextResponse.json({
        translation: raw,
        detectedLanguage: 'Unknown',
      });
    }
  } catch (error: unknown) {
    console.error('Translate API error:', error);

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
      { error: { message: 'Failed to translate. Please try again.', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
