import { TurboModuleRegistry } from 'react-native';

export type VideoTrimPackage = typeof import('react-native-video-trim');

/**
 * Load the JS wrapper only when its native module exists in the running binary.
 * This avoids TurboModuleRegistry.getEnforcing() causing a red screen in Expo Go
 * or in a development APK built before the video dependency was installed.
 */
export function loadNativeVideoTools(): VideoTrimPackage {
  if (!TurboModuleRegistry.get('VideoTrim')) {
    throw new Error(
      'Video editing is unavailable in Expo Go. Run “npm run build:dev”, install that APK, then use “npm run start:dev”.',
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-video-trim') as VideoTrimPackage;
  } catch {
    throw new Error('Video tools could not be loaded. Install a newly rebuilt APK and try again.');
  }
}
