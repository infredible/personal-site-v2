import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { highlighted, context } = await req.json();

  if (!highlighted || !context) {
    return new Response('Missing highlighted text or context', { status: 400 });
  }

  const prompt = `You are an expert explainer. Here is the full content for context:\n\n"""\n${context}\n"""\n\nThe user has highlighted the following text and wants to know more about it:\n\n"""\n${highlighted}\n"""\n\nPlease provide a clear, concise, and helpful explanation of the highlighted text, using the full context if needed.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant who explains text in context.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });

  // Convert async iterable to ReadableStream
  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of response) {
        const text = chunk.choices?.[0]?.delta?.content || '';
        if (text) {
          controller.enqueue(new TextEncoder().encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
} 