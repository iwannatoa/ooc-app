/**
 * Settings components module
 * 
 * This module contains all settings-related components organized by functionality:
 * - SettingsTabs: Tab navigation for settings panel
 * - GeneralSettings: General application settings
 * - AppearanceSettings: Theme, font, and visual settings
 * - AISettings: AI provider configuration
 * - AdvancedSettings: Advanced configuration options
 */

export { SettingsTabs, SettingsTabPane, type SettingsTab } from './SettingsTabs';
export { GeneralSettings, type GeneralSettingsRef } from './GeneralSettings';
export { AppearanceSettings, type AppearanceSettingsRef } from './AppearanceSettings';
export { AISettings, type AISettingsRef } from './AISettings';
export { AdvancedSettings, type AdvancedSettingsRef } from './AdvancedSettings';
export { default as SettingsPanel } from './SettingsPanel';

