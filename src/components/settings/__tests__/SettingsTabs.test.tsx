import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsTabs, SettingsTabPane } from '../SettingsTabs';

describe('SettingsTabs', () => {
  it('should render tabs with children', () => {
    render(
      <SettingsTabs>
        <SettingsTabPane
          tab='general'
          label='General'
        >
          <div>General Content</div>
        </SettingsTabPane>
        <SettingsTabPane
          tab='ai'
          label='AI'
        >
          <div>AI Content</div>
        </SettingsTabPane>
      </SettingsTabs>
    );

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('should show default tab content', () => {
    render(
      <SettingsTabs defaultTab='general'>
        <SettingsTabPane
          tab='general'
          label='General'
        >
          <div>General Content</div>
        </SettingsTabPane>
        <SettingsTabPane
          tab='ai'
          label='AI'
        >
          <div>AI Content</div>
        </SettingsTabPane>
      </SettingsTabs>
    );

    expect(screen.getByText('General Content')).toBeInTheDocument();
    expect(screen.queryByText('AI Content')).not.toBeInTheDocument();
  });

  it('should switch tabs when clicked', () => {
    render(
      <SettingsTabs defaultTab='general'>
        <SettingsTabPane
          tab='general'
          label='General'
        >
          <div>General Content</div>
        </SettingsTabPane>
        <SettingsTabPane
          tab='ai'
          label='AI'
        >
          <div>AI Content</div>
        </SettingsTabPane>
      </SettingsTabs>
    );

    const aiTab = screen.getByText('AI');
    fireEvent.click(aiTab);

    expect(screen.queryByText('General Content')).not.toBeInTheDocument();
    expect(screen.getByText('AI Content')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(
      <SettingsTabs defaultTab='general'>
        <SettingsTabPane
          tab='general'
          label='General'
        >
          <div>General Content</div>
        </SettingsTabPane>
        <SettingsTabPane
          tab='ai'
          label='AI'
        >
          <div>AI Content</div>
        </SettingsTabPane>
      </SettingsTabs>
    );

    const generalTab = screen.getByText('General');
    // Check if tab button has active class (may be in className string)
    expect(generalTab.className).toContain('active');
  });
});

