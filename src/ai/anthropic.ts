import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiMessage } from './provider';
import { config } from '../config';

const client = new Anthropic({ apiKey: config.ai.anthropicApiKey });

export const anthropicProvider: AiProvider = {
  async complete(systemPrompt: string, message: AiMessage): Promise<string> {
    const userContent: Anthropic.MessageParam['content'] =
      message.type === 'image' && message.imageBase64
        ? [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (message.imageMediaType || 'image/jpeg') as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: message.imageBase64,
              },
            },
            ...(message.text ? [{ type: 'text' as const, text: message.text }] : []),
          ]
        : message.text || '';

    const response = await client.messages.create({
      model: config.ai.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  },
};
