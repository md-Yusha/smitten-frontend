import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

type SmittenLogoProps = {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export function SmittenLogo({ width = 116, height = 38, style }: SmittenLogoProps) {
  return (
    <Image
      source={require('../../../assets/images/logo_trans.png')}
      style={[{ width, height }, style]}
      contentFit="contain"
      accessibilityLabel="Smittenz"
    />
  );
}
