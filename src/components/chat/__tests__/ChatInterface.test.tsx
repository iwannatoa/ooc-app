import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatInterface from '../ChatInterface';

// Mock child components
vi.mock('../MessageList', () => ({
  default: () => <div data-testid='message-list'>MessageList</div>,
}));

vi.mock('../../story', () => ({
  StoryActions: () => <div data-testid='story-actions'>StoryActions</div>,
}));

describe('ChatInterface', () => {
  it('should render message list and story actions', () => {
    render(<ChatInterface />);

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('story-actions')).toBeInTheDocument();
  });
});




