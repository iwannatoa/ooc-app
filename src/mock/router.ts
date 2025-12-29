/**
 * Mock Router
 * 
 * Provides routing-based mock interception for API requests.
 * Allows registering mock handlers for specific endpoints and methods.
 */

import { isMockMode } from './index';

export type RoutePattern = string | RegExp;
export type RouteHandler = (req: {
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
}) => Promise<any>;

interface Route {
  method: string;
  pattern: RoutePattern;
  handler: RouteHandler;
}

class MockRouter {
  private routes: Route[] = [];

  /**
   * Register a mock route handler
   * 
   * @param method HTTP method (GET, POST, DELETE, etc.)
   * @param pattern Endpoint pattern (string for exact match, RegExp for pattern match)
   * @param handler Handler function that returns mock response
   */
  register(method: string, pattern: RoutePattern, handler: RouteHandler): void {
    this.routes.push({ method: method.toUpperCase(), pattern, handler });
  }

  /**
   * Match a request to a registered route
   * 
   * @param method HTTP method
   * @param endpoint Request endpoint
   * @param params Request parameters (query, body, etc.)
   * @returns Mock response if matched, null otherwise
   */
  async match(
    method: string,
    endpoint: string,
    params: {
      query?: Record<string, any>;
      body?: any;
    } = {}
  ): Promise<any | null> {
    if (!isMockMode()) {
      return null;
    }

    const normalizedMethod = method.toUpperCase();
    const [path, queryString] = endpoint.split('?');
    const query = this.parseQuery(queryString || '');

    // Try exact match first
    for (const route of this.routes) {
      if (route.method !== normalizedMethod) continue;

      let matches = false;
      if (typeof route.pattern === 'string') {
        matches = path === route.pattern;
      } else {
        matches = route.pattern.test(path);
      }

      if (matches) {
        return await route.handler({
          params: {},
          query: { ...query, ...params.query },
          body: params.body,
        });
      }
    }

    return null;
  }

  /**
   * Parse query string into object
   */
  private parseQuery(queryString: string): Record<string, any> {
    const params: Record<string, any> = {};
    if (!queryString) return params;

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = value
          ? decodeURIComponent(value)
          : true;
      }
    }
    return params;
  }

  /**
   * Clear all registered routes (useful for testing)
   */
  clear(): void {
    this.routes = [];
  }
}

export const mockRouter = new MockRouter();

