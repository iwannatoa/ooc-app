import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatInput from '../ChatInput';

const handleSendMessage = vi.fn();

vi.mock('@/hooks/useConversationManagement', () => ({
  useConversationManagement: () => ({
    handleSendMessage,
    activeConversationId: 'conv-1',
  }),
}));

vi.mock('@/hooks/useChatState', () => ({
  useChatState: () => ({
    isSending: false,
  }),
}));

vi.mock('@/i18n/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      if (k === 'messages.inputPlaceholder') return 'Type message';
      if (k === 'messages.send') return 'Send';
      if (k === 'messages.sending') return 'Sending';
      return k;
    },
  }),
}));

describe('ChatInput', () => {
  it('sends trimmed content and clears input', async () => {
    handleSendMessage.mockResolvedValueOnce(undefined);
    render(<ChatInput />);
    const input = screen.getByPlaceholderText('Type message');
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(handleSendMessage).toHaveBeenCalledWith('hello');
    });
    expect((input as HTMLInputElement).value).toBe('');
  });
});
