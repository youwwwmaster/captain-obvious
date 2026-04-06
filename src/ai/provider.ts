export interface AiMessage {
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
  imageMediaType?: string;
}

export interface AiProvider {
  complete(systemPrompt: string, message: AiMessage): Promise<string>;
}
