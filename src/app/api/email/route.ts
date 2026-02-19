import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { mode, content, tone, to, subject, enhancements = [] } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: 'API key not configured. Please set OPENAI_API_KEY in your .env.local file.', code: 'MISSING_API_KEY' } },
        { status: 401 }
      );
    }

    let prompt: string;

    if (mode === 'write') {
      prompt = `You are an expert email writer. Write a complete, well-structured email with the following details:
- Recipient: ${to || 'Not specified'}
- Subject: ${subject || 'Not specified'}
- Tone: ${tone}
- Instructions/Content: ${content}

Write only the email body (including greeting and sign-off). Make it sound natural, ${tone}, and professional where appropriate. Do not include the subject line in the output.`;
    } else {
      const enhancementInstructions: string[] = [
        '- Adjust the tone to be: ' + tone,
        '- Keep the original meaning and intent',
      ];
      if (enhancements.includes('grammar_check')) {
        enhancementInstructions.push('- Fix grammar, spelling, and punctuation');
      }
      if (enhancements.includes('clarity')) {
        enhancementInstructions.push('- Improve clarity and flow; make ideas and structure easy to follow');
      }
      if (enhancements.includes('conciseness')) {
        enhancementInstructions.push('- Make the email more concise; remove redundancy and tighten wording');
      }
      if (enhancements.includes('persuasiveness')) {
        enhancementInstructions.push('- Strengthen persuasiveness; use clear calls to action and compelling phrasing where appropriate');
      }
      // If none selected, apply default polish (grammar + clarity)
      if (enhancements.length === 0) {
        enhancementInstructions.push('- Fix grammar, spelling, and punctuation');
        enhancementInstructions.push('- Improve clarity and flow');
      }

      prompt = `You are an expert email editor. Polish and improve the following email.
${enhancementInstructions.join('\n')}

Original email:
${content}

Provide only the polished email text.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const result = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ result });
  } catch (error: unknown) {
    console.error('Email API error:', error);

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
      { error: { message: 'Failed to generate the email. Please try again.', code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
