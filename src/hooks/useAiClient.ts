import { useState, useCallback } from 'react';
import {
  AppSettings,
  ChatMessage,
  DeepSeekConfig,
  OllamaConfig,
  OpenAIConfig,
} from '@/types';
import { ENV_CONFIG } from '@/types/constants';

export const useAiClient = (settings: AppSettings) => {
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (message: string): Promise<ChatMessage> => {
      setLoading(true);

      try {
        const provider = settings.ai.provider;
        const config = settings.ai[provider];

        let response: string;
        console.log(config);
        switch (provider) {
          case 'ollama':
            response = await callOllamaAPI(message, config as OllamaConfig);
            break;
          case 'deepseek':
            response = await callDeepSeekAPI(message, config as DeepSeekConfig);
            break;
          case 'openai':
            response = await callOpenAiAPI(message, config as OpenAIConfig);
            break;
          default:
            throw new Error(`不支持的提供商: ${provider}`);
        }

        return {
          role: 'assistant',
          content: response,
          model: config.model,
          timestamp: Date.now(),
        };
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  return { sendMessage, loading };
};

// API 调用函数
const callOllamaAPI = async (
  message: string,
  config: OllamaConfig
): Promise<string> => {
  const response = await fetch(`${ENV_CONFIG.VITE_FLASK_API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      message: message,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
};

const callDeepSeekAPI = async (
  message: string,
  config: DeepSeekConfig
): Promise<string> => {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: message }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
};

const callOpenAiAPI = async (
  message: string,
  config: OpenAIConfig
): Promise<string> => {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: message }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
};
