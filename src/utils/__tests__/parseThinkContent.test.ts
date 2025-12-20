import { describe, expect, it } from 'vitest';
import { parseThinkContent, stripThinkContent } from '../parseThinkContent';

describe('parseThinkContent', () => {
  it('should parse text without think tags', () => {
    const text = 'Hello world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      content: 'Hello world',
      isOpen: false,
    });
  });

  it('should parse text with closed think tags', () => {
    const text = 'Hello <think>thinking</think> world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: 'text',
      content: 'Hello',
      isOpen: false,
    });
    expect(result[1]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: false,
    });
    expect(result[2]).toEqual({
      type: 'text',
      content: 'world',
      isOpen: false,
    });
  });

  it('should parse text with redacted_reasoning tags', () => {
    const text = 'Hello <think>thinking</think> world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: false,
    });
  });

  it('should parse text with open think tags', () => {
    const text = 'Hello <think>thinking';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'text',
      content: 'Hello',
      isOpen: false,
    });
    expect(result[1]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: true,
    });
  });

  it('should parse text with open redacted_reasoning tags', () => {
    const text = 'Hello <think>thinking';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: true,
    });
  });

  it('should parse text with multiple think blocks', () => {
    const text = 'Start <think>think1</think> middle <think>think2</think> end';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('text');
    expect(result[0].content).toBe('Start');
    expect(result[1].type).toBe('think');
    expect(result[1].content).toBe('think1');
    expect(result[2].type).toBe('text');
    expect(result[2].content).toBe('middle');
    expect(result[3].type).toBe('think');
    expect(result[3].content).toBe('think2');
    expect(result[4].type).toBe('text');
    expect(result[4].content).toBe('end');
  });

  it('should parse text with think at the beginning', () => {
    const text = '<think>thinking</think>Hello world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: false,
    });
    expect(result[1]).toEqual({
      type: 'text',
      content: 'Hello world',
      isOpen: false,
    });
  });

  it('should parse text with think at the end', () => {
    const text = 'Hello world<think>thinking</think>';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'text',
      content: 'Hello world',
      isOpen: false,
    });
    expect(result[1]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: false,
    });
  });

  it('should parse empty text', () => {
    const text = '';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'text',
      content: '',
      isOpen: false,
    });
  });

  it('should parse text with only think tags', () => {
    const text = '<think>thinking</think>';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'think',
      content: 'thinking',
      isOpen: false,
    });
  });

  it('should parse text with multiline think content', () => {
    const text = 'Hello <think>line1\nline2\nline3</think> world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(3);
    expect(result[1].content).toBe('line1\nline2\nline3');
  });

  it('should handle nested tags correctly', () => {
    const text = 'Hello <think>thinking <b>bold</b></think> world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(3);
    expect(result[1].content).toBe('thinking <b>bold</b>');
  });

  it('should parse text with whitespace around tags', () => {
    const text = 'Hello   <think>thinking</think>   world';
    const result = parseThinkContent(text);

    expect(result).toHaveLength(3);
    expect(result[0].content).toBe('Hello');
    expect(result[2].content).toBe('world');
  });

  it('should handle case-insensitive tags', () => {
    const text = 'Hello <THINK>thinking</think> world';
    const result = parseThinkContent(text);

    // The regex uses case-insensitive flag, but let's verify it works
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe('stripThinkContent', () => {
  it('should strip closed think tags', () => {
    const text = 'Hello <think>thinking</think> world';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello world');
  });

  it('should strip closed redacted_reasoning tags', () => {
    const text = 'Hello <think>thinking</think> world';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello world');
  });

  it('should strip open think tags', () => {
    const text = 'Hello <think>thinking';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello');
  });

  it('should strip multiple think blocks', () => {
    const text = 'Start <think>think1</think> middle <think>think2</think> end';
    const result = stripThinkContent(text);

    expect(result).toBe('Start middle end');
  });

  it('should strip think code blocks', () => {
    const text = 'Hello ```think\ntest\n``` world';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello world');
  });

  it('should strip standalone think markers', () => {
    const text = 'Hello ```think``` world';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello world');
  });

  it('should handle empty text', () => {
    const text = '';
    const result = stripThinkContent(text);

    expect(result).toBe('');
  });

  it('should handle text without think tags', () => {
    const text = 'Hello world';
    const result = stripThinkContent(text);

    expect(result).toBe('Hello world');
  });

  it('should clean up extra whitespace', () => {
    const text = 'Hello <think>thinking</think>\n\n\n\nworld';
    const result = stripThinkContent(text);

    expect(result).not.toContain('\n\n\n\n');
  });

  it('should handle text with only think tags', () => {
    const text = '<think>thinking</think>';
    const result = stripThinkContent(text);

    expect(result).toBe('');
  });
});
