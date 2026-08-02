import { useTheme } from '@/context/ThemeContext';
import { smittenAlertFromError } from '@/src/components/ui/SmittenAlertProvider';
import { subscribeCoupleSocket } from '@/src/services/coupleSocket';
import { gamesApi, type GamesState, type TicTacToeGame as TicTacToeGameState } from '@/src/services/gamesApi';
import { getPartnerChatLabel, useAuthStore } from '@/src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';
import { GamesBottomNav } from './GamesBottomNav';
import { LoveChallengeGame } from './LoveChallengeGame';
import { TicTacToeGame } from './TicTacToeGame';

type GamesModalProps = {
  visible: boolean;
  onClose: () => void;
  initialGame?: 'none' | 'love-challenge' | 'tictactoe';
};

const emptyGamesState: GamesState = {
  scores: { self: 0, partner: 0 },
  loveChallenges: [],
  ticTacToe: null,
  ticTacToeScores: { self: 0, partner: 0 },
};

export function GamesModal({ visible, onClose, initialGame }: GamesModalProps) {
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardVisible } = useKeyboardInset();
  const apiUser = useAuthStore((s) => s.apiUser);
  const user = useAuthStore((s) => s.user);
  const selfId = apiUser?.id || '';

  const selfName = user?.nicknameSelf?.trim() || 'You';
  const partnerName = user ? getPartnerChatLabel(user) : 'Partner';

  const [gameState, setGameState] = useState<GamesState | null>(null);
  const currentGameState = gameState ?? emptyGamesState;
  const [refreshing, setRefreshing] = useState(false);
  const [activeGame, setActiveGame] = useState<'none' | 'love-challenge' | 'tictactoe'>('none');
  const overallScores = {
    self: (currentGameState.scores?.self ?? 0) + (currentGameState.ticTacToeScores?.self ?? 0),
    partner: (currentGameState.scores?.partner ?? 0) + (currentGameState.ticTacToeScores?.partner ?? 0),
  };

  const fetchState = useCallback(async () => {
    try {
      const state = await gamesApi.getState();
      setGameState(state);
    } catch (e) {
      setGameState(emptyGamesState);
      smittenAlertFromError(e, 'Could not load games', 'error');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void fetchState();
      
      if (initialGame && initialGame !== 'none') {
        setActiveGame(initialGame);
      } else {
        setActiveGame('none');
      }

      // Ensure socket is active for real-time scoreboard & invites
      const { ensureCoupleSocket } = require('@/src/services/coupleSocket');
      if (apiUser?.coupleId) {
        void ensureCoupleSocket(apiUser.coupleId);
      }

      // Listen for socket events to update games in real-time
      const unsubChallenge = subscribeCoupleSocket('games:challenge_updated', () => {
        void fetchState();
      });
      const unsubTicTacToe = subscribeCoupleSocket('games:tictactoe_updated', (payload) => {
        const game = payload as TicTacToeGameState;
        setGameState((prev) => (prev ? { ...prev, ticTacToe: game } : prev));
        void fetchState();
      });

      return () => {
        unsubChallenge();
        unsubTicTacToe();
      };
    }
  }, [visible, fetchState, initialGame, apiUser?.coupleId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchState();
    setRefreshing(false);
  };

  const router = useRouter();

  const transitionTo = (game: 'none' | 'love-challenge' | 'tictactoe') => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveGame(game);
  };

  const handleOpenGame = async (game: 'love-challenge' | 'tictactoe') => {
    Haptics.selectionAsync();
    let latestState = currentGameState;
    if (game === 'tictactoe') {
      try {
        latestState = await gamesApi.getState();
        setGameState(latestState);
      } catch {
        latestState = currentGameState;
      }
    }
    if (game === 'tictactoe' && latestState.ticTacToe?.status === 'ACTIVE') {
      try {
        await gamesApi.endTicTacToe(latestState.ticTacToe.id);
      } catch {
        /* stale games should not block opening */
      }
      setGameState((prev) => ({ ...(prev ?? emptyGamesState), ticTacToe: null }));
    }
    transitionTo(game);
    // No invite emit here — the partner gets notified when a quiz is actually created
    // (via games:challenge_updated socket event + backend push notification)
  };

  const handleBack = () => transitionTo('none');

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href as any);
  };

  const handleRequestClose = () => {
    if (activeGame !== 'none') {
      transitionTo('none');
    } else {
      onClose();
    }
  };

  const renderGame = () => {
    if (activeGame === 'love-challenge') {
      return (
        <LoveChallengeGame
          challenges={currentGameState.loveChallenges}
          selfId={selfId}
          selfName={selfName}
          partnerName={partnerName}
          scores={currentGameState.scores}
          themeColor={themeColor}
          onRefresh={fetchState}
          onBack={handleBack}
        />
      );
    }
    if (activeGame === 'tictactoe') {
      return (
        <TicTacToeGame
          game={currentGameState.ticTacToe}
          selfId={selfId}
          selfName={selfName}
          partnerName={partnerName}
          scores={currentGameState.ticTacToeScores}
          themeColor={themeColor}
          onGameChange={(game) => setGameState((prev) => ({ ...(prev ?? emptyGamesState), ticTacToe: game }))}
          onRefresh={fetchState}
          onBack={handleBack}
        />
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleRequestClose} statusBarTranslucent={true}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ flex: 1 }}>
          {activeGame === 'none' ? (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Couple Games</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={themeColor} />}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.weeklyScoreCard}>
                  <View style={styles.weeklyScoreRow}>
                    <View>
                      <Text style={styles.weeklyScoreLabel}>Overall score</Text>
                      <Text style={styles.weeklyScoreSub}>who&apos;s winning this week?</Text>
                    </View>
                    <Text style={[styles.weeklyScoreValue, { color: themeColor }]}>
                      You {overallScores.self} — {overallScores.partner} {partnerName}
                    </Text>
                  </View>
                </View>

                <View style={styles.gamesList}>
                  <LinearGradient
                    colors={['#fff7f4', '#fffefb']}
                    start={[0, 0]}
                    end={[1, 1]}
                    style={styles.gameCard}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF3ED' }]}>
                      <Ionicons name="chatbox-ellipses" size={26} color="#F07A3A" />
                    </View>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameLabel}>Couple Challenge</Text>
                      <Text style={styles.gameDesc}>
                        Answer fun questions your partner asks about the two of you.
                      </Text>
                      <View style={styles.gameMetaPill}>
                        <Ionicons name="time-outline" size={12} color="#9a6070" />
                        <Text style={styles.gameMetaText}>2-10 min</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => void handleOpenGame('love-challenge')}
                      style={styles.playBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.playBtnText}>Play</Text>
                    </TouchableOpacity>
                  </LinearGradient>

                  <LinearGradient
                    colors={['#fff7f4', '#fffefb']}
                    start={[0, 0]}
                    end={[1, 1]}
                    style={styles.gameCard}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: '#F3F0FF' }]}>
                      <Text style={[styles.hashIcon, { color: '#8B5CF6' }]}>#</Text>
                    </View>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameLabel}>Tic Tac Toe</Text>
                      <Text style={styles.gameDesc}>
                        The classic game, sealed with a kiss. Best of three?
                      </Text>
                      <View style={styles.gameMetaPill}>
                        <Ionicons name="flash-outline" size={12} color="#9a6070" />
                        <Text style={styles.gameMetaText}>Quick match</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => void handleOpenGame('tictactoe')}
                      style={styles.playBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.playBtnText}>Play</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </ScrollView>
            </>
          ) : (
            <View style={{ flex: 1 }}>{renderGame()}</View>
          )}
        </View>
        {!keyboardVisible ? <GamesBottomNav activeTab="index" onNavigate={handleNavigate} /> : null}
      </View>
    </Modal>
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
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 22,
    paddingBottom: 32,
  },
  weeklyScoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  weeklyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyScoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#231f20',
    marginBottom: 2,
  },
  weeklyScoreSub: { display: 'none' },
  weeklyScoreValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  gamesList: {
    gap: 20,
  },
  gameCard: {
    minHeight: 218,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3e8d8',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  hashIcon: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  gameInfo: {
    width: '100%',
  },
  gameLabel: {
    fontSize: 21,
    color: '#302a42',
    fontFamily: 'PlayfairDisplay_700Bold',
    marginBottom: 6,
  },
  gameDesc: {
    fontSize: 13,
    maxWidth: '92%',
    color: '#9b8d9e',
    lineHeight: 19,
    marginBottom: 20,
  },
  gameMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8f4f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  gameMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a6070',
  },
  playBtn: {
    position: 'absolute',
    right: 24,
    bottom: 22,
    minWidth: 78,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#E8536E',
    shadowColor: '#E8536E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
