import { NativeModules, Platform } from 'react-native';

const { AppIconModule } = NativeModules;

export type AppIconType = 'default' | 'calculator' | 'clock';

export const appIconService = {
  /**
   * Changes the launcher app icon and label on Android.
   */
  async changeIcon(icon: AppIconType): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    if (!AppIconModule) {
      console.warn('AppIconModule is not available in this build.');
      throw new Error('App icon switching is not available in this build. Rebuild the Android app first.');
    }
    const changed = await AppIconModule.changeIcon(icon);
    if (!changed) throw new Error('App icon change failed.');
    return true;
  },

  /**
   * Gets the currently active app icon component.
   */
  async getCurrentIcon(): Promise<AppIconType> {
    if (Platform.OS !== 'android') {
      return 'default';
    }
    if (!AppIconModule) {
      return 'default';
    }
    try {
      return await AppIconModule.getCurrentIcon();
    } catch {
      return 'default';
    }
  },
};
