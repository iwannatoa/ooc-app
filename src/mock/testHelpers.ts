/*
 * Copyright © 2016-2025 Patrick Zhang.
 * All Rights Reserved.
 *
 * Test helpers for testing protected/private methods
 */

import { vi } from 'vitest';
import { BaseApiClient } from '@/api/base';
import type { GetApiUrlFn, RequestConfig } from '@/api/base';

/**
 * Test helper class that exposes protected methods for testing
 * This avoids the need for `as unknown as` type assertions
 */
export class TestableBaseApiClient extends BaseApiClient {
  /**
   * Expose protected get method for testing
   */
  async testGet<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.get<T>(endpoint, config);
  }

  /**
   * Expose protected post method for testing
   */
  async testPost<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.post<T>(endpoint, body, config);
  }

  /**
   * Expose protected delete method for testing
   */
  async testDelete<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.delete<T>(endpoint, body, config);
  }

  /**
   * Expose protected stream method for testing
   */
  async testStream(
    endpoint: string,
    body: unknown,
    onChunk: (chunk: string, accumulated: string) => void,
    config?: RequestConfig
  ): Promise<string> {
    return this.stream(endpoint, body, onChunk, config);
  }
}

/**
 * Create a testable BaseApiClient instance
 */
export const createTestableBaseApiClient = (
  getApiUrl: GetApiUrlFn
): TestableBaseApiClient => {
  return new TestableBaseApiClient(getApiUrl);
};

/**
 * Create a mock Response object for testing
 */
export const createMockResponse = (
  overrides: Partial<Response> = {}
): Response => {
  const mockResponse: Response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'default' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    json: vi.fn(),
    text: vi.fn(),
    clone: vi.fn(),
    ...overrides,
  } as Response;
  return mockResponse;
};

/**
 * Create a mock ReadableStream for testing
 * Note: Response.body expects ReadableStream<Uint8Array> where Uint8Array uses ArrayBuffer
 * TypeScript is strict about ArrayBuffer vs ArrayBufferLike, so we use a type assertion
 */
export const createMockReadableStream = (
  getReader: () => {
    read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    releaseLock: () => void;
  }
): ReadableStream<Uint8Array> => {
  // Create a proper ReadableStream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Mock implementation - controller not used in tests
    },
  });
  // Override getReader to return our mock reader
  Object.defineProperty(stream, 'getReader', {
    value: getReader,
    writable: false,
    enumerable: false,
    configurable: true,
  });
  // Type assertion to ensure compatibility with Response.body
  // The stream is functionally correct, but TypeScript is strict about ArrayBuffer vs ArrayBufferLike
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return stream as any as ReadableStream<Uint8Array>;
};

