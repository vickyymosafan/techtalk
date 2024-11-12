import Groq from 'groq-sdk';
import { SYSTEM_PROMPT } from './prompts'

// Initialize Groq client
export const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
})

// Helper function to stream responses
export async function streamGroqResponse(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  handlers: {
    onToken: (token: string) => void;
    onComplete: () => void;
    onError: (error: any) => void;
  }
) {
  const groq = new Groq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      "model": "llama-3.2-90b-text-preview",
    "temperature": 1,
    "max_tokens": 8192,
    "top_p": 1,
    "stream": true,
    "stop": null
    })

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || ''
      handlers.onToken(content)
    }

    handlers.onComplete()
  } catch (error) {
    console.error('Groq API Error:', error)
    handlers.onError(error)
  }
} 