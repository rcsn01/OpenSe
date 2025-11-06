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
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    // muted UI tones for secondary buttons / inactive states
    mutedBackground: '#1f2937',
    mutedText: '#9ca3af',
    //buttons
    buttonBackgroundDefault: '#ffffffff',
    buttonBackgroundSelected: '#949494ff',
    buttonTextDefault: '#505050ff',
    buttonTextSelected: '#000000ff',
    // product card
    productCardBackground: '#0b1220',
    productCardBorder: '#1f2937',
    productThumbBackground: '#111827',
    productMutedText: '#4363a3ff',
    //menu bar color
    menuBarDefault: '#838383ff',
    menuBarSelected: '#ffffffff',
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
