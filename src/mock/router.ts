/**
 * Mock Router
 * 
 * Provides routing-based mock interception for API requests.
 * Allows registering mock handlers for specific endpoints and methods.
 */

const MOCK_MODE_GLOBAL_KEY = '__OOC_MOCK_MODE_ENABLED__';

const isMockMode = (): boolean => {
  const globalState = globalThis as unknown as Record<string, unknown>;
  const value = globalState[MOCK_MODE_GLOBAL_KEY];
  if (typeof value === 'boolean') {
    return value;
  }
  return (
    import.meta.env.VITE_USE_MOCK === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false')
  );
};

export type RoutePattern = string | RegExp;
export type RouteHandler = (req: {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
}) => Promise<unknown>;

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
      query?: Record<string, unknown>;
      body?: unknown;
    } = {}
  ): Promise<unknown | null> {
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
  private parseQuery(queryString: string): Record<string, string | boolean> {
    const params: Record<string, string | boolean> = {};
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

