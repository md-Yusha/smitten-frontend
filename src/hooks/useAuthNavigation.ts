import { useRouter } from 'expo-router';
import type { ApiUser } from '@/src/services/api';
import { canAccessApp, needsKeyDisplay, needsPayment, needsStory } from '@/src/services/session';

/** Route user to the correct step after auth state changes. */
export function useAuthNavigation() {
  const router = useRouter();

  return function navigateForUser(user: ApiUser, options?: { showKeyScreen?: boolean; showWelcome?: boolean }) {
    if (!user.coupleId && !user.isCoupleOwner) {
      router.replace('/auth/connect');
      return;
    }
    if (needsPayment(user)) {
      router.replace('/auth/payment');
      return;
    }
    // Show welcome screen after successful connection
    if (options?.showWelcome) {
      router.replace('/auth/welcome');
      return;
    }
    if (options?.showKeyScreen || (needsStory(user) && needsKeyDisplay(user))) {
      router.replace({ pathname: '/auth/your-key', params: { code: user.inviteCode ?? '' } });
      return;
    }
    if (needsStory(user)) {
      router.replace('/auth/story');
      return;
    }
    if (canAccessApp(user)) {
      router.replace('/(tabs)');
      return;
    }
    if (needsKeyDisplay(user)) {
      router.replace({ pathname: '/auth/your-key', params: { code: user.inviteCode ?? '' } });
      return;
    }
    router.replace('/auth/payment');
  };
}
