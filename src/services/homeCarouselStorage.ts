import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export const HOME_CAROUSEL_SLOTS = 3;
export type HomeCarouselImages = [string | null, string | null, string | null];

function storageKey(userId: string) {
  return `smitten:home-carousel:${userId}`;
}

function imageDirectory() {
  return `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}home-carousel/`;
}

function imagePath(userId: string, slot: number) {
  return `${imageDirectory()}${userId}-${slot}-${Date.now()}.jpg`;
}

export async function loadHomeCarouselImages(userId: string): Promise<HomeCarouselImages> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    const images = Array.from({ length: HOME_CAROUSEL_SLOTS }, (_, index) => {
      const uri = Array.isArray(parsed) && typeof parsed[index] === 'string' ? parsed[index] : null;
      return uri;
    }) as HomeCarouselImages;
    return images;
  } catch {
    return [null, null, null];
  }
}

export async function saveHomeCarouselImage(userId: string, slot: number, sourceUri: string): Promise<string> {
  if (slot < 0 || slot >= HOME_CAROUSEL_SLOTS) throw new Error('Invalid carousel slot');
  const directory = imageDirectory();
  if (!directory) throw new Error('Local storage is unavailable');
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const images = await loadHomeCarouselImages(userId);
  const previousUri = images[slot];
  const destination = imagePath(userId, slot);
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  if (previousUri && previousUri !== destination) {
    await FileSystem.deleteAsync(previousUri, { idempotent: true });
  }
  images[slot] = destination;
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(images));
  return destination;
}
