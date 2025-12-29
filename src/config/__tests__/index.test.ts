import { describe, it, expect } from 'vitest';
import { ENV_CONFIG } from '../index';

describe('ENV_CONFIG', () => {
  it('should have DEV configuration', () => {
    expect(ENV_CONFIG.DEV).toBeDefined();
    expect(ENV_CONFIG.DEV.ENABLE_MOCK_MODE).toBe(true);
    expect(ENV_CONFIG.DEV.ENABLE_DEV_TOOLS).toBe(true);
    expect(ENV_CONFIG.DEV.LOG_LEVEL).toBe('debug');
    expect(ENV_CONFIG.DEV.API_BASE_URL).toBe('http://localhost:5000');
  });

  it('should have PROD configuration', () => {
    expect(ENV_CONFIG.PROD).toBeDefined();
    expect(ENV_CONFIG.PROD.ENABLE_MOCK_MODE).toBe(false);
    expect(ENV_CONFIG.PROD.ENABLE_DEV_TOOLS).toBe(false);
    expect(ENV_CONFIG.PROD.LOG_LEVEL).toBe('error');
    expect(ENV_CONFIG.PROD.API_BASE_URL).toBe('http://localhost:5000');
  });

  it('should have different mock mode settings for DEV and PROD', () => {
    expect(ENV_CONFIG.DEV.ENABLE_MOCK_MODE).not.toBe(
      ENV_CONFIG.PROD.ENABLE_MOCK_MODE
    );
  });

  it('should have different dev tools settings for DEV and PROD', () => {
    expect(ENV_CONFIG.DEV.ENABLE_DEV_TOOLS).not.toBe(
      ENV_CONFIG.PROD.ENABLE_DEV_TOOLS
    );
  });

  it('should have different log levels for DEV and PROD', () => {
    expect(ENV_CONFIG.DEV.LOG_LEVEL).not.toBe(ENV_CONFIG.PROD.LOG_LEVEL);
  });
});

