import { describe, it, expect } from 'vitest';
import conversationsReducer, {
  setConversationListLoading,
  setConversationListSuccess,
  prependConversation,
  removeConversationFromList,
} from '../conversationsSlice';
import type { ConversationWithSettings } from '@/types';

const sample: ConversationWithSettings = {
  id: 'c1',
  title: 'A',
  messages: [],
  createdAt: 1,
  updatedAt: 1,
  settings: { conversation_id: 'c1', title: 'A' } as any,
};

describe('conversationsSlice', () => {
  it('handles loading then success', () => {
    let s = conversationsReducer(undefined, setConversationListLoading());
    expect(s.listStatus).toBe('loading');
    s = conversationsReducer(s, setConversationListSuccess([sample]));
    expect(s.items).toHaveLength(1);
    expect(s.listStatus).toBe('idle');
  });

  it('prepends and dedupes by id', () => {
    let s = conversationsReducer(
      undefined,
      setConversationListSuccess([sample])
    );
    const updated = { ...sample, title: 'B' };
    s = conversationsReducer(s, prependConversation(updated));
    expect(s.items).toHaveLength(1);
    expect(s.items[0].title).toBe('B');
  });

  it('removeConversationFromList', () => {
    let s = conversationsReducer(
      undefined,
      setConversationListSuccess([sample])
    );
    s = conversationsReducer(s, removeConversationFromList('c1'));
    expect(s.items).toHaveLength(0);
  });
});
