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
      expect(handleSendMessage).toHaveBeenCalledWith('hello', {
        inputMode: 'freeChat',
        messageParts: [{ type: 'text', content: 'hello' }],
      });
    });
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('includes selected files in message parts', async () => {
    handleSendMessage.mockResolvedValueOnce(undefined);
    render(<ChatInput />);
    const input = screen.getByPlaceholderText('Type message');
    const fileInput = screen.getByLabelText('chat-attachments');
    const file = new File(['binary'], 'photo.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(input, { target: { value: 'with file' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(handleSendMessage).toHaveBeenCalledWith(
        'with file',
        expect.objectContaining({
          messageParts: expect.arrayContaining([
            expect.objectContaining({ type: 'text', content: 'with file' }),
            expect.objectContaining({
              type: 'image',
              name: 'photo.png',
              mimeType: 'image/png',
              localFile: file,
            }),
          ]),
        })
      );
    });
  });
});
