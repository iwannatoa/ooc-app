/**
 * AI & Model Types
 *
 * Types related to AI providers, models, and generation requests/responses.
 */

/**
 * Ollama model information
 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest?: string;
  details?: ModelDetails;
  model: string;
}

/**
 * Model details from Ollama
 */
export interface ModelDetails {
  format: string;
  family: string;
  families: string[] | null;
  parameter_size: string;
  quantization_level: string;
}

/**
 * Request for generating text with Ollama
 */
export interface GenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: GenerateOptions;
}

/**
 * Generation options for AI models
 */
export interface GenerateOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
}

/**
 * Response from Ollama generate API
 */
export interface GenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Response containing list of available models
 */
export interface ModelsResponse {
  success: boolean;
  models: OllamaModel[];
  error: string;
}

/**
 * AI provider type
 */
export type AIProvider = 'ollama' | 'deepseek';

/**
 * Base configuration for AI providers
 */
export interface AIProviderConfig {
  provider: AIProvider;
  baseUrl: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
}

/**
 * Configuration for Ollama provider
 */
export interface OllamaConfig extends AIProviderConfig {
  provider: 'ollama';
}

/**
 * Configuration for DeepSeek provider
 */
export interface DeepSeekConfig extends AIProviderConfig {
  provider: 'deepseek';
  apiKey: string;
}

/**
 * AI settings configuration
 */
export interface AISettings {
  provider: AIProvider;
  ollama: OllamaConfig;
  deepseek: DeepSeekConfig;
}

