import React from 'react';
import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';
import { unMeGradientProps, type UnMeGradientKey } from '@/constants/unMeGradients';

type Props = Omit<LinearGradientProps, 'colors' | 'start' | 'end' | 'locations'> & {
  variant: UnMeGradientKey;
};

export function UnMeLinearGradient({ variant, ...rest }: Props) {
  const spec = unMeGradientProps(variant);
  return <LinearGradient {...spec} {...rest} />;
}
