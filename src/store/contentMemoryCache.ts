import type { ApiMessage } from '@/src/services/chatApi';
import type { ApiMemory } from '@/src/services/memoriesApi';
import type { ApiNote } from '@/src/services/notesApi';
import type { ApiSpecialMoment } from '@/src/services/specialMomentsApi';
import type { VaultItem } from '@/src/services/vaultApi';

let vault: VaultItem[] | null = null;
let memories: ApiMemory[] | null = null;
let notes: ApiNote[] | null = null;
let specialMoments: ApiSpecialMoment[] | null = null;
let chat: ApiMessage[] | null = null;

export function setMemoryVault(items: VaultItem[]) {
  vault = items;
}

export function getMemoryVault(): VaultItem[] | null {
  return vault;
}

export function setMemoryMemories(items: ApiMemory[]) {
  memories = items;
}

export function getMemoryMemories(): ApiMemory[] | null {
  return memories;
}

export function setMemoryNotes(items: ApiNote[]) {
  notes = items;
}

export function getMemoryNotes(): ApiNote[] | null {
  return notes;
}

export function setMemorySpecialMoments(items: ApiSpecialMoment[]) {
  specialMoments = items;
}

export function getMemorySpecialMoments(): ApiSpecialMoment[] | null {
  return specialMoments;
}

export function setMemoryChat(messages: ApiMessage[]) {
  chat = messages;
}

export function getMemoryChat(): ApiMessage[] | null {
  return chat;
}

export function clearMemoryContentCaches() {
  vault = null;
  memories = null;
  notes = null;
  specialMoments = null;
  chat = null;
}
