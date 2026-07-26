import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { memoriesApi, type ApiMemory } from '@/src/services/memoriesApi';
import { specialMomentsApi } from '@/src/services/specialMomentsApi';
import { vaultApi } from '@/src/services/vaultApi';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useCoupleContentStore } from '@/src/store/coupleContentStore';
import { getMemoryMemories, getMemorySpecialMoments, getMemoryVault } from '@/src/store/contentMemoryCache';
import { getUpcomingSpecialMoments, type SpecialMomentPreview } from '@/src/services/specialMoments';

function parseLocalDate(value: string) {
  const parts = value.slice(0, 10).split('-').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(value);
}

function futureMemoryPreviews(memories: ApiMemory[]): SpecialMomentPreview[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return memories.flatMap((memory) => {
    const date = parseLocalDate(memory.memoryAt);
    if (!Number.isFinite(date.getTime()) || date <= start) return [];
    return [{ id: `future-memory-${memory.id}`, title: memory.title, daysLeft: Math.round((date.getTime() - start.getTime()) / 86_400_000), dateIso: memory.memoryAt.slice(0, 10) }];
  });
}

function mergeUpcoming(dates: SpecialMomentPreview[], memories: ApiMemory[]) {
  return [...dates, ...futureMemoryPreviews(memories)].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
}

export function useHomeStats() {
  const apiUser = useAuthStore((s) => s.apiUser);
  const coupleId = useAuthStore((s) => s.apiUser?.coupleId);
  const revision = useCoupleContentStore((s) => s.revision);
  const mem0 = getMemoryMemories();
  const sm0 = getMemorySpecialMoments();
  const vault0 = getMemoryVault();
  const [memoryCount, setMemoryCount] = useState(mem0?.length ?? 0);
  const [memories, setMemories] = useState<ApiMemory[]>(mem0 ?? []);
  const [vaultCount, setVaultCount] = useState(vault0?.length ?? 0);
  const [latestMemory, setLatestMemory] = useState<ApiMemory | null>(() => {
    if (!mem0?.length) return null;
    return [...mem0].sort(
      (a, b) => new Date(b.memoryAt).getTime() - new Date(a.memoryAt).getTime(),
    )[0];
  });
  const [specialMoments, setSpecialMoments] = useState<SpecialMomentPreview[]>(() =>
    mergeUpcoming(sm0?.length ? getUpcomingSpecialMoments(sm0) : [], mem0 ?? []),
  );
  const [loading, setLoading] = useState(false);

  const countsRef = useRef({ memoryCount: 0, vaultCount: 0 });
  countsRef.current = { memoryCount, vaultCount };

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!coupleId) {
      setMemoryCount(0);
      setMemories([]);
      setVaultCount(0);
      setLatestMemory(null);
      setSpecialMoments([]);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const [memRes, smRes, vaultRes] = await Promise.all([
        memoriesApi.list(),
        specialMomentsApi.list(),
        vaultApi.list(),
      ]);
      setMemoryCount(memRes.memories.length);
      setMemories(memRes.memories);
      setVaultCount(vaultRes.items.length);
      const sorted = [...memRes.memories].sort(
        (a, b) => new Date(b.memoryAt).getTime() - new Date(a.memoryAt).getTime(),
      );
      setLatestMemory(sorted[0] ?? null);
      const birthdayMoments = [
        apiUser?.dateOfBirth
          ? {
              id: `birthday-${apiUser.id}`,
              title: `${apiUser.name}'s Birthday`,
              momentAt: apiUser.dateOfBirth,
              creatorId: apiUser.id,
              creatorName: apiUser.name,
              createdAt: apiUser.dateOfBirth,
            }
          : null,
        apiUser?.partner?.dateOfBirth
          ? {
              id: `birthday-${apiUser.partner.id}`,
              title: `${apiUser.partner.name}'s Birthday`,
              momentAt: apiUser.partner.dateOfBirth,
              creatorId: apiUser.partner.id,
              creatorName: apiUser.partner.name,
              createdAt: apiUser.partner.dateOfBirth,
            }
          : null,
      ].filter((moment): moment is NonNullable<typeof moment> => Boolean(moment));
      setSpecialMoments(mergeUpcoming(getUpcomingSpecialMoments([...smRes.moments, ...birthdayMoments], 50), memRes.memories));
    } catch {
      /* keep previous counts */
    } finally {
      setLoading(false);
    }
  }, [apiUser, coupleId]);

  useFocusEffect(
    useCallback(() => {
      const { memoryCount: mc, vaultCount: vc } = countsRef.current;
      void refresh({ silent: mc > 0 || vc > 0 });
    }, [refresh]),
  );

  useEffect(() => {
    if (revision > 0) void refresh();
  }, [revision, refresh]);

  return { memoryCount, vaultCount, memories, latestMemory, specialMoments, loading, refresh };
}
