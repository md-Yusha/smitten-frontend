import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { gamesApi, type TicTacToeGame as TicTacToeGameState } from '@/src/services/gamesApi';
import { smittenAlert, smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { useAuthStore } from '@/src/store/useAuthStore';

type Props = {
  game: TicTacToeGameState | null;
  selfId: string;
  selfName: string;
  partnerName: string;
  scores: { self: number; partner: number };
  themeColor: string;
  onGameChange: (game: TicTacToeGameState | null) => void;
  onRefresh: () => void;
  onBack: () => void;
};

function labelFor(userId: string | null | undefined, selfId: string, selfName: string, partnerName: string) {
  if (!userId) return '';
  return userId === selfId ? selfName : partnerName;
}

export function TicTacToeGame({
  game,
  selfId,
  selfName,
  partnerName,
  scores,
  themeColor,
  onGameChange,
  onRefresh,
  onBack,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const { width: windowWidth } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [optimisticBoard, setOptimisticBoard] = useState<string[] | null>(null);
  const endingRef = useRef(false);
  const announcedResultRef = useRef<string | null>(null);

  const boardSize = Math.min(330, Math.max(240, windowWidth - 40));
  const cellSize = (boardSize - 40) / 3;

  const rawBoard: unknown = optimisticBoard ?? game?.board;
  const boardSource = Array.isArray(rawBoard)
    ? rawBoard
    : typeof rawBoard === 'string'
      ? rawBoard.split(',')
      : [];
  const board = Array.from({ length: 9 }, (_, idx) => boardSource[idx] ?? '');

  const isMyInvite = game?.status === 'PENDING' && game.invitedById === selfId;
  const isInvited = game?.status === 'PENDING' && game.invitedById !== selfId;
  const isActive = game?.status === 'ACTIVE';
  const isCompleted = game?.status === 'COMPLETED';
  const shouldEndGame = game?.status === 'PENDING' || game?.status === 'ACTIVE';
  const isMyTurn = isActive && game?.turnUserId === selfId;
  const mySymbol = game?.playerXId === selfId ? 'X' : game?.playerOId === selfId ? 'O' : '';
  const winnerName = labelFor(game?.winnerId, selfId, selfName, partnerName);

  useEffect(() => {
    if (!game || game.status !== 'COMPLETED') return;
    const resultKey = `${game.id}:${game.updatedAt}`;
    if (announcedResultRef.current === resultKey) return;
    announcedResultRef.current = resultKey;
    if (game.isDraw) {
      smittenAlert({ title: 'It’s a draw!', message: 'So close — play again for the decider.', tone: 'info' });
    } else if (game.winnerId === selfId) {
      smittenAlert({ title: 'You win! 🎉', message: 'That was a lovely match.', tone: 'success' });
    } else {
      smittenAlert({ title: 'You lose', message: `${partnerName} won this round. Ready for a rematch?`, tone: 'error' });
    }
  }, [game, partnerName, selfId]);

  useEffect(() => {
    setOptimisticBoard(null);
  }, [game?.id, game?.updatedAt]);

  const endCurrentGame = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    try {
      if (game?.id && shouldEndGame) {
        await gamesApi.endTicTacToe(game.id);
        onGameChange(null);
        onRefresh();
      }
    } catch {
      /* cleanup should not block navigation */
    } finally {
      endingRef.current = false;
    }
  }, [game?.id, onGameChange, onRefresh, shouldEndGame]);

  const handleBack = async () => {
    await endCurrentGame();
    onBack();
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if ((next === 'background' || next === 'inactive') && game?.id && shouldEndGame) {
        void endCurrentGame();
      }
    });
    return () => sub.remove();
  }, [endCurrentGame, game?.id, shouldEndGame]);

  const invite = async () => {
    setBusy(true);
    try {
      Haptics.selectionAsync();
      const res = await gamesApi.inviteTicTacToe();
      onGameChange(res.game);
      onRefresh();
    } catch (e) {
      smittenAlertFromError(e, 'Tic Tac Toe', 'error');
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!game) return;
    setBusy(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const res = await gamesApi.acceptTicTacToeInvite(game.id);
      onGameChange(res.game);
      onRefresh();
    } catch (e) {
      smittenAlertFromError(e, 'Tic Tac Toe', 'error');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!game) return;
    setBusy(true);
    try {
      await gamesApi.declineTicTacToeInvite(game.id);
      onGameChange(null);
      onRefresh();
    } catch (e) {
      smittenAlertFromError(e, 'Tic Tac Toe', 'error');
    } finally {
      setBusy(false);
    }
  };

  const playAgain = async () => {
    if (!game?.id) {
      await invite();
      return;
    }
    setBusy(true);
    try {
      Haptics.selectionAsync();
      const res = await gamesApi.rematchTicTacToe(game.id);
      onGameChange(res.game);
      onRefresh();
    } catch (e) {
      smittenAlertFromError(e, 'Tic Tac Toe', 'error');
    } finally {
      setBusy(false);
    }
  };

  const move = async (idx: number) => {
    if (!game || !isMyTurn || board[idx]) return;
    const next = [...board];
    next[idx] = mySymbol;
    setOptimisticBoard(next);
    Haptics.selectionAsync();
    try {
      const res = await gamesApi.makeTicTacToeMove(idx);
      onGameChange(res.game);
      onRefresh();
    } catch (e) {
      setOptimisticBoard(null);
      smittenAlertFromError(e, 'Tic Tac Toe', 'error');
    }
  };

  const statusText = (() => {
    if (!game) return 'Invite your partner to start a live match.';
    if (isMyInvite) return `Waiting for ${partnerName} to join.`;
    if (isInvited) return `${partnerName} invited you to play.`;
    if (isCompleted) {
      if (game.isDraw) return 'Match ended in a draw.';
      return `${winnerName} won this match.`;
    }
    return isMyTurn ? 'Your turn' : `${partnerName}'s turn`;
  })();

  const cellIcon = (value: string) => {
    if (value === 'X') {
      return <Ionicons name="heart" size={40} color={themeColor} />;
    }
    if (value === 'O') {
      return <Ionicons name="ellipse" size={40} color="#8b5cf6" />;
    }
    return null;
  };

  const getCellColor = (idx: number) => {
    const colors = [
      '#E8536E',
      '#8B5CF6',
      '#F0A020',
      '#10B981',
      '#E8536E',
      '#8B5CF6',
      '#10B981',
      '#F0A020',
      '#F0A020',
    ];
    return colors[idx];
  };

  const showBoard = game?.status === 'ACTIVE' || game?.status === 'COMPLETED';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => void handleBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tic Tac Toe</Text>
        <Text style={styles.headerStatus} numberOfLines={1}>
          {isActive
            ? isMyTurn
              ? 'Your turn'
              : `${partnerName}'s turn`
            : isCompleted
              ? game.isDraw
                ? 'Draw'
                : `${winnerName} won`
              : 'Invite'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {!showBoard ? <View style={styles.scoresRow}>
          <View style={styles.playerBadge}>
            <UserAvatar uri={user?.avatarSelf} size={44} />
            <Text style={styles.playerName}>
              You <Text style={{ color: themeColor }}>♥</Text> {scores.self}
            </Text>
          </View>
          <View style={styles.playerBadge}>
            <UserAvatar uri={user?.avatarPartner} size={44} />
            <Text style={styles.playerName}>
              {partnerName} <Text style={{ color: themeColor }}>♥</Text> {scores.partner}
            </Text>
          </View>
        </View> : null}

        {!showBoard ? <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{statusText}</Text>
          {isActive ? (
            <Text style={styles.statusSub}>
              {labelFor(game.playerXId, selfId, selfName, partnerName)} plays as ♥, {labelFor(game.playerOId, selfId, selfName, partnerName)} plays as ●.
            </Text>
          ) : null}
        </View> : null}

        {!game || game.status === 'DECLINED' ? (
          <TouchableOpacity disabled={busy} onPress={invite} style={[styles.primaryBtn, { backgroundColor: themeColor }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Invite to Play</Text>}
          </TouchableOpacity>
        ) : isInvited ? (
          <View style={styles.actionRow}>
            <TouchableOpacity disabled={busy} onPress={decline} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={accept} style={[styles.primaryBtn, { backgroundColor: themeColor, flex: 1 }]}>
              <Text style={styles.primaryText}>Let&apos;s play</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isMyInvite ? (
          <TouchableOpacity
            disabled={busy}
            onPress={() =>
              smittenAlert({
                title: 'Invite sent',
                message: 'Your partner has been invited. We will open the match when they accept.',
                tone: 'info',
              })
            }
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>Invite pending</Text>
          </TouchableOpacity>
        ) : null}

        {showBoard ? (
          <>
          <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {[0, 3, 6].map((start, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={[
                  styles.boardRow,
                  { width: boardSize - 40, height: cellSize },
                  rowIndex === 2 && styles.boardRowLast,
                ]}
              >
                {[0, 1, 2].map((offset) => {
                  const idx = start + offset;
                  const cell = board[idx] ?? '';
                  const color = getCellColor(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      disabled={!isMyTurn || Boolean(cell) || busy}
                      onPress={() => move(idx)}
                      activeOpacity={0.78}
                      style={[
                        styles.cell,
                        { width: cellSize, height: cellSize },
                        offset === 2 && styles.cellLast,
                        {
                          borderColor: color,
                          backgroundColor: '#fff',
                        },
                      ]}
                    >
                      {cellIcon(cell)}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.scoresRow}>
            <View style={styles.playerBadge}>
              <UserAvatar uri={user?.avatarSelf} size={42} />
              <Text style={styles.playerName}>You <Text style={{ color: '#f0b72f' }}>♥</Text> {scores.self}</Text>
            </View>
            <Text style={styles.versus}>VS</Text>
            <View style={styles.playerBadge}>
              <UserAvatar uri={user?.avatarPartner} size={42} />
              <Text style={styles.playerName}>{partnerName} <Text style={{ color: themeColor }}>♥</Text> {scores.partner}</Text>
            </View>
          </View>
          </>
        ) : null}

        {isCompleted ? (
          <TouchableOpacity
            disabled={busy}
            onPress={() => void playAgain()}
            style={styles.playAgainBtn}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator color={themeColor} /> : <Text style={styles.playAgainText}>Play Again</Text>}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,26,26,0.06)',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    color: '#302a42',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  headerStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9a6070',
    fontFamily: 'Inter_600SemiBold',
    maxWidth: 120,
    textAlign: 'right',
  },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 28, paddingTop: 30, gap: 20, paddingBottom: 36 },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  playerBadge: {
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#231f20',
  },
  versus: { color: '#cbbdca', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 14 },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fff',
    padding: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  statusSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
  board: {
    alignSelf: 'center',
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#fff',
    padding: 10,
  },
  boardRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  boardRowLast: { marginBottom: 0 },
  cell: {
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cellLast: { marginRight: 0 },
  actionRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 26, 0.12)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryText: { color: '#6B7280', fontSize: 15, fontWeight: '800' },
  playAgainBtn: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0d4da',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  playAgainText: {
    color: '#302a42',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
