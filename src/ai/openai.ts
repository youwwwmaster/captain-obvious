import OpenAI from 'openai';
import { AiProvider, AiMessage } from './provider';
import { config } from '../config';

const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

export const openaiProvider: AiProvider = {
  async complete(systemPrompt: string, message: AiMessage): Promise<string> {
    const userContent: OpenAI.ChatCompletionContentPart[] =
      message.type === 'image' && message.imageBase64
        ? [
            {
              type: 'image_url',
              image_url: {
                url: `data:${message.imageMediaType || 'image/jpeg'};base64,${message.imageBase64}`,
              },
            },
            ...(message.text ? [{ type: 'text' as const, text: message.text }] : []),
          ]
        : [{ type: 'text', text: message.text || '' }];

    const response = await client.chat.completions.create({
      model: config.ai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    return response.choices[0].message.content || '';
  },
};
