import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5_000; // 5 seconds

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.RateLimitError) return true;
  if (error instanceof Error) {
    return error.message.includes('429') || /rate.?limit|quota/i.test(error.message);
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    let body: { messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid request body.', code: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }

    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Messages are required and must be a non-empty array.', code: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: 'API key not configured. Please set OPENAI_API_KEY in your .env.local file.', code: 'MISSING_API_KEY' } },
        { status: 401 }
      );
    }

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
    );

    // Retry loop with exponential backoff for rate-limit errors
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 5s, 10s, 20s
          console.log(`Rate-limited — retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(delay);
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: chatMessages,
        });

        const response = completion.choices[0]?.message?.content || '';
        return NextResponse.json({ response });
      } catch (error: unknown) {
        lastError = error;
        if (!isRateLimitError(error) || attempt === MAX_RETRIES) {
          break;
        }
      }
    }

    throw lastError;
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    // Use OpenAI's typed errors for precise handling
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

    if (error instanceof OpenAI.PermissionDeniedError) {
      return NextResponse.json(
        { error: { message: 'Access denied. Your API key does not have permission for this model.', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    if (error instanceof OpenAI.BadRequestError) {
      const msg = error.message;
      if (/content.?policy|safety|moderation/i.test(msg)) {
        return NextResponse.json(
          { error: { message: 'Your message was flagged by content moderation. Please rephrase.', code: 'CONTENT_FILTERED' } },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: { message: 'Invalid request. Please try rephrasing your message.', code: 'BAD_REQUEST' } },
        { status: 400 }
      );
    }

    if (error instanceof OpenAI.InternalServerError || error instanceof OpenAI.APIConnectionError) {
      return NextResponse.json(
        { error: { message: 'OpenAI is temporarily unavailable. Please try again in a moment.', code: 'SERVICE_UNAVAILABLE' } },
        { status: 503 }
      );
    }

    // Fallback
    return NextResponse.json(
      { error: { message: 'Failed to generate a response. Please try again.', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
