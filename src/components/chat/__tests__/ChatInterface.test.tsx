import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatInterface from '../ChatInterface';

// Mock child components
vi.mock('../MessageList', () => ({
  default: () => <div data-testid='message-list'>MessageList</div>,
}));

vi.mock('../ChatOnboarding', () => ({
  default: () => <div data-testid='chat-onboarding'>ChatOnboarding</div>,
}));

vi.mock('../../story', () => ({
  StoryActions: () => <div data-testid='story-actions'>StoryActions</div>,
}));

vi.mock('../ChatInput', () => ({
  default: () => <div data-testid='chat-input'>ChatInput</div>,
}));

vi.mock('../UserNarrationBar', () => ({
  UserNarrationBar: () => <div data-testid='narration-bar'>NarrationBar</div>,
}));

describe('ChatInterface', () => {
  it('should render message list and story actions', () => {
    render(<ChatInterface />);

    expect(screen.getByTestId('chat-onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('story-actions')).toBeInTheDocument();
  });
});





