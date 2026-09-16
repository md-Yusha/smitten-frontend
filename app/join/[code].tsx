import { useAuthStore } from '@/src/store/useAuthStore';
import { normalizeInviteCode, savePendingInviteCode } from '@/src/services/pendingInvite';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function JoinLinkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const apiUser = useAuthStore((state) => state.apiUser);
  const signedOut = useAuthStore((state) => state.signedOut);
  const [ready, setReady] = useState(false);
  const code = normalizeInviteCode(typeof params.code === 'string' ? params.code : '');

  useEffect(() => {
    let active = true;
    void savePendingInviteCode(code).finally(() => {
      if (!active) return;
      setReady(true);
      if (apiUser && !signedOut) router.replace({ pathname: '/auth/have-key', params: { code } });
      else router.replace('/login');
    });
    return () => {
      active = false;
    };
  }, [apiUser, code, router, signedOut]);

  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#BC142B" /></View>;
  }
  return <Redirect href="/login" />;
}
