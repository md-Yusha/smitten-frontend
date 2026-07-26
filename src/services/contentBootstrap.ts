import { vaultApi } from '@/src/services/vaultApi';
import { memoriesApi } from '@/src/services/memoriesApi';
import { notesApi } from '@/src/services/notesApi';
import { specialMomentsApi } from '@/src/services/specialMomentsApi';
import { chatApi } from '@/src/services/chatApi';
import { writeVaultCache, readVaultCache } from '@/src/services/vaultCache';
import { writeMemoriesCache, readMemoriesCache } from '@/src/services/memoriesCache';
import { writeNotesCache, readNotesCache } from '@/src/services/notesCache';
import { writeSpecialMomentsCache, readSpecialMomentsCache } from '@/src/services/specialMomentsCache';
import { writeChatCache, readChatCache } from '@/src/services/chatCache';
import {
  prefetchVaultItems,
  prefetchChatMediaUrls,
  prefetchMemoryImages,
} from '@/src/services/mediaPrefetch';
import { preloadAuthMediaHeaders } from '@/src/services/authMediaHeaders';
import {
  setMemoryVault,
  setMemoryMemories,
  setMemoryNotes,
  setMemorySpecialMoments,
  setMemoryChat,
} from '@/src/store/contentMemoryCache';

/** Load disk → memory (fast). Call before showing tabs. */
export async function warmContentCaches(coupleId: string, selfId?: string): Promise<void> {
  preloadAuthMediaHeaders();
  const [vault, mems, notesList, moments, chat] = await Promise.all([
    readVaultCache(coupleId),
    readMemoriesCache(coupleId),
    readNotesCache(coupleId),
    readSpecialMomentsCache(coupleId),
    readChatCache(coupleId),
  ]);

  if (vault?.length) {
    setMemoryVault(vault);
    prefetchVaultItems(vault, { selfId });
    if (selfId) prefetchVaultItems(vault, { partnerOnly: true, selfId });
  }
  if (mems?.length) {
    setMemoryMemories(mems);
    prefetchMemoryImages(mems);
  }
  if (notesList?.length) setMemoryNotes(notesList);
  if (moments?.length) setMemorySpecialMoments(moments);
  if (chat?.length) {
    setMemoryChat(chat);
    prefetchChatMediaUrls(chat.filter((m) => m.kind === 'gif').map((m) => m.body));
  }
}

/** Network refresh — never blocks UI. */
export async function refreshContentCaches(coupleId: string, selfId?: string): Promise<void> {
  preloadAuthMediaHeaders();
  const [vaultRes, memRes, notesRes, smRes, chatRes] = await Promise.allSettled([
    vaultApi.list(),
    memoriesApi.list(),
    notesApi.list(),
    specialMomentsApi.list(),
    chatApi.getMessages(),
  ]);

  if (vaultRes.status === 'fulfilled') {
    const { items } = vaultRes.value;
    setMemoryVault(items);
    await writeVaultCache(coupleId, items);
    prefetchVaultItems(items, { selfId });
    if (selfId) prefetchVaultItems(items, { partnerOnly: true, selfId });
  }

  if (memRes.status === 'fulfilled') {
    const memories = memRes.value.memories;
    setMemoryMemories(memories);
    await writeMemoriesCache(coupleId, memories);
    prefetchMemoryImages(memories);
  }

  if (notesRes.status === 'fulfilled') {
    setMemoryNotes(notesRes.value.notes);
    await writeNotesCache(coupleId, notesRes.value.notes);
  }

  if (smRes.status === 'fulfilled') {
    setMemorySpecialMoments(smRes.value.moments);
    await writeSpecialMomentsCache(coupleId, smRes.value.moments);
  }

  if (chatRes.status === 'fulfilled') {
    const { messages } = chatRes.value;
    setMemoryChat(messages);
    await writeChatCache(coupleId, messages);
    prefetchChatMediaUrls(messages.filter((m) => m.kind === 'gif').map((m) => m.body));
  }
}
