/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#e8f3ffff',
    icon: '#000000ff',
    tabIconDefault: '#000000ff', 
    tabIconSelected: '#000000ff',
    // muted UI tones for secondary buttons / inactive states
    mutedBackground: '#dadadaff',
    mutedText: '#a0a0a0ff',
    //buttons
    buttonBackgroundDefault: '#ffffffff',
    buttonBackgroundSelected: '#e9e9e9ff',
    buttonTextDefault: '#505050ff',
    buttonTextSelected: '#000000ff',
    // product card
    productCardBackground: '#ffffffff',
    productCardBorder: '#e5e7eb',
    productThumbBackground: '#f3f4f6',
    productMutedText: '#919191ff',
    //menu bar color
    menuBarDefault: '#949494ff',
    menuBarSelected: '#000000ff',
    // actions
    link: '#007AFF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#181818ff',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#a69b9bff',
    tabIconSelected: '#fff',
    // muted UI tones for secondary buttons / inactive states
    mutedBackground: '#414141ff',
    mutedText: '#9ca3af',
    //buttons
    buttonBackgroundDefault: '#1d1d1dff',
    buttonBackgroundSelected: '#464646ff',
    buttonTextDefault: '#a0a0a0ff',
    buttonTextSelected: '#cececeff',
    // product card
    productCardBackground: '#1f1f1fff',
    productCardBorder: '#7c7c7cff',
    productThumbBackground: '#000000ff',
    productMutedText: '#5a5a5aff',
    //menu bar color
    menuBarDefault: '#5c5c5cff',
    menuBarSelected: '#ffffffff',
    // actions
    link: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// screens color
// Centralized colors for screen-level UI (headers, cards, borders, muted text, etc.)
export const Screens = {
  light: {
    headerBackground: '#fff',
    cardBackground: '#fff',
    borderColor: '#e5e7eb',
    mutedText: '#6b7280',
    tint: Colors.light.tint,
    text: Colors.light.text,
  },
  dark: {
    headerBackground: '#0b1220',
    cardBackground: '#0b1220',
    borderColor: '#1f2937',
    mutedText: '#9ca3af',
    tint: Colors.dark.tint,
    text: Colors.dark.text,
  },
};
