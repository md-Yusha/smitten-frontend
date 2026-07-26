import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricKind = 'fingerprint' | 'face' | 'iris' | 'mixed' | 'biometric';

export interface BiometricCapability {
  available: boolean;
  kind: BiometricKind;
  label: string;
  unlockLabel: string;
  settingsTitle: string;
  settingsSubtitle: string;
  promptDescription: string;
}

const unavailableCapability: BiometricCapability = {
  available: false,
  kind: 'biometric',
  label: 'Device biometrics',
  unlockLabel: 'Use device biometrics',
  settingsTitle: 'Biometric unlock',
  settingsSubtitle: 'Use your device biometrics for app lock and vault lock',
  promptDescription: 'Use the biometric sensor configured on this device.',
};

export function isBiometricAuthDisabledByEnv(): boolean {
  return process.env.EXPO_PUBLIC_DISABLE_FINGERPRINT_AUTH === 'true';
}

function capabilityForTypes(types: LocalAuthentication.AuthenticationType[]): BiometricCapability {
  const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);
  const supportedCount = [hasFingerprint, hasFace, hasIris].filter(Boolean).length;

  if (supportedCount > 1) {
    return {
      available: true,
      kind: 'mixed',
      label: 'Device biometrics',
      unlockLabel: 'Use device biometrics',
      settingsTitle: 'Biometric unlock',
      settingsSubtitle: 'Use the biometric unlock method configured on this Android device',
      promptDescription: 'Use your device biometric sensor or scanner.',
    };
  }

  if (hasFingerprint) {
    return {
      available: true,
      kind: 'fingerprint',
      label: 'Fingerprint',
      unlockLabel: 'Use fingerprint',
      settingsTitle: 'Fingerprint unlock',
      settingsSubtitle: 'Use this device fingerprint sensor for app lock and vault lock',
      promptDescription: 'Use the fingerprint sensor shown by your device.',
    };
  }

  if (hasFace) {
    return {
      available: true,
      kind: 'face',
      label: 'Face unlock',
      unlockLabel: 'Use face unlock',
      settingsTitle: 'Face unlock',
      settingsSubtitle: 'Use this device face unlock for app lock and vault lock',
      promptDescription: 'Use the face unlock flow shown by your device.',
    };
  }

  if (hasIris) {
    return {
      available: true,
      kind: 'iris',
      label: 'Iris unlock',
      unlockLabel: 'Use iris unlock',
      settingsTitle: 'Iris unlock',
      settingsSubtitle: 'Use this device iris scanner for app lock and vault lock',
      promptDescription: 'Use the iris unlock flow shown by your device.',
    };
  }

  return unavailableCapability;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (isBiometricAuthDisabledByEnv()) {
    return unavailableCapability;
  }

  if (Platform.OS !== 'android') {
    return unavailableCapability;
  }

  try {
    const [hasHardware, enrolled, types, enrolledLevel] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ]);

    const hasBiometricEnrollment =
      enrolledLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK ||
      enrolledLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG;

    if (!hasHardware || !enrolled || !hasBiometricEnrollment) {
      return unavailableCapability;
    }

    return capabilityForTypes(types);
  } catch {
    return unavailableCapability;
  }
}

export async function authenticateWithDeviceBiometrics(capability?: BiometricCapability): Promise<boolean> {
  if (isBiometricAuthDisabledByEnv()) {
    return false;
  }

  const activeCapability = capability?.available ? capability : await getBiometricCapability();

  if (!activeCapability.available) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Smittenz',
    promptSubtitle: activeCapability.label,
    promptDescription: activeCapability.promptDescription,
    cancelLabel: 'Use PIN',
    disableDeviceFallback: true,
    biometricsSecurityLevel: 'weak',
  });

  return result.success;
}
