import { router } from 'expo-router';

/**
 * Return to the app root landing (app/index.tsx) and clear signup/auth screens
 * from the back stack. Plain replace('/') from inside (tabs) targets (tabs)/index.
 */
let lastGoToLandingTime = 0;

export function goToLanding() {
  const now = Date.now();
  if (now - lastGoToLandingTime < 1500) {
    setTimeout(() => {
      try {
        router.replace('/');
      } catch {
        /* fallback */
      }
    }, 120);
    return;
  }
  lastGoToLandingTime = now;

  try {
    router.replace('/login');
    setTimeout(() => {
      try {
        router.replace('/');
      } catch {
        /* fallback */
      }
    }, 120);
    setTimeout(() => {
      try {
        router.replace('/');
      } catch {
        /* fallback */
      }
    }, 350);
  } catch {
    try {
      router.replace('/');
    } catch {
      /* fallback */
    }
  }
}
