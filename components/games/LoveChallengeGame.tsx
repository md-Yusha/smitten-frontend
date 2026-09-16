import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { gamesApi, type LoveChallenge } from '@/src/services/gamesApi';
import { smittenAlert } from '@/src/components/ui/SmittenAlertProvider';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { KeyboardAwareScrollView } from '@/src/components/ui/KeyboardAwareScrollView';
import { useAuthStore } from '@/src/store/useAuthStore';

type Props = {
  challenges: LoveChallenge[];
  selfId: string;
  selfName: string;
  partnerName: string;
  scores: { self: number; partner: number };
  themeColor: string;
  onRefresh: () => void | Promise<void>;
  onBack: () => void;
};

export function LoveChallengeGame({
  challenges,
  selfId,
  selfName,
  partnerName,
  scores,
  themeColor,
  onRefresh,
  onBack,
}: Props) {
  const user = useAuthStore((s) => s.user);

  const [view, setView] = useState<'answer' | 'create'>('answer');
  const [loading, setLoading] = useState(false);
  const [localChallenges, setLocalChallenges] = useState<LoveChallenge[]>(challenges);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; question: string } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Create form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState<number | null>(null);
  const createScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setLocalChallenges(challenges);
  }, [challenges]);

  const pendingChallenges = useMemo(
    () => localChallenges.filter((c) => c.creatorId !== selfId && c.answeredIdx === null),
    [localChallenges, selfId]
  );

  const currentChallenge = pendingChallenges[0] ?? null;
  const currentQuestionNumber = currentChallenge
    ? pendingChallenges.findIndex((c) => c.id === currentChallenge.id) + 1
    : 0;
  const completedHistory = useMemo(
    () => localChallenges.filter((challenge) => challenge.answeredIdx !== null).slice(0, 10),
    [localChallenges],
  );

  const scoreAndHistory = (
    <View style={styles.historyCard}>
      <View style={styles.historyScoreRow}>
        <View>
          <Text style={styles.historyEyebrow}>SCORE CARD</Text>
          <Text style={styles.historyTitle}>Game history</Text>
        </View>
        <Text style={[styles.historyScore, { color: themeColor }]}>You {scores.self} — {scores.partner} {partnerName}</Text>
      </View>
      {completedHistory.length ? (
        <ScrollView
          style={styles.historyList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={completedHistory.length > 5}
        >
          {completedHistory.map((challenge) => {
            const expanded = expandedHistoryId === challenge.id;
            const correct = challenge.answeredIdx === challenge.correctIdx;
            const answerLabel = challenge.creatorId === selfId ? `${partnerName}'s answer` : 'Your answer';
            return (
              <View key={challenge.id} style={styles.historyItem}>
                <TouchableOpacity
                  onPress={() => setExpandedHistoryId(expanded ? null : challenge.id)}
                  activeOpacity={0.78}
                  style={styles.historySummary}
                >
                  <View style={[styles.historyResultIcon, { backgroundColor: correct ? '#e7f8ef' : '#fdeceb' }]}>
                    <Ionicons name={correct ? 'checkmark' : 'close'} size={16} color={correct ? '#29b96f' : '#e65347'} />
                  </View>
                  <Text style={styles.historyQuestion} numberOfLines={2}>{challenge.question}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#a797a4" />
                </TouchableOpacity>
                {expanded ? (
                  <View style={styles.historyDrawer}>
                    <Text style={styles.historyAnswerLabel}>{answerLabel}</Text>
                    <Text style={styles.historyAnswer}>{challenge.options[challenge.answeredIdx ?? 0] || 'No answer'}</Text>
                    {!correct ? (
                      <>
                        <Text style={[styles.historyAnswerLabel, { marginTop: 9 }]}>Correct answer</Text>
                        <Text style={[styles.historyAnswer, styles.correctAnswer]}>{challenge.options[challenge.correctIdx]}</Text>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : <Text style={styles.noHistory}>Completed questions will appear here.</Text>}
    </View>
  );

  const handleSelect = (idx: number) => {
    setSelectedAnswer(idx);
    Haptics.selectionAsync();
  };

  const handleSubmit = () => {
    if (!currentChallenge || selectedAnswer === null) return;
    void handleAnswerChallenge(currentChallenge.id, selectedAnswer);
  };

  const handleAnswerChallenge = async (challengeId: string, idx: number) => {
    const challenge = localChallenges.find((c) => c.id === challengeId);
    const prevChallenges = localChallenges;
    const nextChallenges = localChallenges.map((c) => (c.id === challengeId ? { ...c, answeredIdx: idx } : c));

    setSelectedAnswer(null);
    setLocalChallenges(nextChallenges);
    setLoading(true);
    Haptics.selectionAsync();

    try {
      await gamesApi.answerLoveChallenge(challengeId, idx);
      await onRefresh();
      if (challenge) {
        const isCorrect = idx === challenge.correctIdx;
        Haptics.notificationAsync(
          isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
        );
        setAnswerResult({ correct: isCorrect, question: challenge.question });
        setTimeout(() => setAnswerResult(null), 3000);
      }
    } catch {
      setLocalChallenges(prevChallenges);
      smittenAlert({ title: 'Error', message: 'Could not submit answer.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!question.trim()) {
      smittenAlert({ title: 'Question required', message: 'Please write a question for your partner', tone: 'error' });
      return;
    }
    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 3) {
      smittenAlert({ title: 'More options needed', message: 'Please provide at least 3 options', tone: 'error' });
      return;
    }
    if (correctIdx === null || correctIdx >= filteredOptions.length) {
      smittenAlert({ title: 'Select correct option', message: 'Please mark one of the options as correct', tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await gamesApi.createLoveChallenge({
        question: question.trim(),
        options: filteredOptions,
        correctIdx,
      });
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectIdx(null);
      setView('answer');
      onRefresh();
    } catch {
      smittenAlert({ title: 'Failed to create', message: 'Could not send challenge. Try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (text: string, index: number) => {
    const next = [...options];
    next[index] = text;
    setOptions(next);
  };

  if (answerResult) {
    return (
      <View style={styles.container}>
        <View style={styles.answerContainer}>
          <View
            style={[
              styles.resultFeedbackCard,
              { borderColor: answerResult.correct ? '#2ecc71' : '#e74c3c' },
            ]}
          >
            <Ionicons
              name={answerResult.correct ? 'checkmark-circle' : 'close-circle'}
              size={64}
              color={answerResult.correct ? '#2ecc71' : '#e74c3c'}
              style={{ marginBottom: 16 }}
            />
            <Text
              style={[
                styles.resultFeedbackTitle,
                { color: answerResult.correct ? '#2ecc71' : '#e74c3c' },
              ]}
            >
              {answerResult.correct ? '🎉 You win!' : 'You lose'}
            </Text>
            <Text style={styles.resultFeedbackSub}>
              {answerResult.correct
                ? 'You knew it! Your partner will be notified.'
                : 'Not quite! The right answer has been revealed.'}
            </Text>
            <TouchableOpacity
              onPress={() => setAnswerResult(null)}
              style={[styles.submitBtn, styles.resultButton, { backgroundColor: themeColor, marginTop: 24 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (view === 'create') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('answer')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Challenge</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardFlex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <KeyboardAwareScrollView
            ref={createScrollRef}
            contentContainerStyle={[styles.scrollContent, styles.createScrollContent]}
            bottomPadding={180}
            extraScrollHeight={110}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.sectionTitle}>Create a Challenge</Text>
          <Text style={styles.sectionDesc}>
            Ask a question and set options. Don&apos;t forget to check the correct answer!
          </Text>

          <Text style={styles.inputLabel}>Your Question</Text>
          <TextInput
            placeholder="e.g. What is my favorite weekend activity?"
            placeholderTextColor="#9ca3af"
            value={question}
            onChangeText={setQuestion}
            onFocus={() => createScrollRef.current?.scrollTo({ y: 80, animated: true })}
            style={styles.questionInput}
            multiline
          />

          <Text style={styles.inputLabel}>Options & Pre-select Correct Answer</Text>
          <View style={styles.optionsContainer}>
            {options.map((opt, idx) => (
              <View key={idx} style={styles.optionRow}>
                <TextInput
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#9ca3af"
                  value={opt}
                  onChangeText={(val) => updateOption(val, idx)}
                  onFocus={() => {
                    setTimeout(() => {
                      createScrollRef.current?.scrollTo({ y: 285 + idx * 62, animated: true });
                    }, 80);
                  }}
                  style={styles.optionInput}
                />
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCorrectIdx(idx);
                  }}
                  style={[
                    styles.checkbox,
                    correctIdx === idx && { backgroundColor: themeColor, borderColor: themeColor },
                  ]}
                >
                  {correctIdx === idx && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            disabled={loading}
            onPress={handleCreateChallenge}
            style={[styles.submitBtn, { backgroundColor: themeColor }]}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send to Partner</Text>}
          </TouchableOpacity>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (!currentChallenge) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Couple Challenge</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {scoreAndHistory}
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#FFF3ED' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={32} color={themeColor} />
            </View>
            <Text style={styles.emptyTitle}>No quizzes waiting</Text>
            <Text style={styles.emptySub}>Send a personalized question to see how well your partner knows you!</Text>
            <TouchableOpacity
              onPress={() => setView('create')}
              style={[styles.submitBtn, styles.compactButton, { backgroundColor: themeColor, marginTop: 24 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Create New Challenge</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Couple Challenge</Text>
        <Text style={styles.headerCounter}>
          Q{currentQuestionNumber}/{pendingChallenges.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.askedRow}>
          <UserAvatar uri={user?.avatarPartner} size={44} />
          <View style={styles.askedTextWrap}>
            <Text style={styles.askedLabel}>{partnerName} asked:</Text>
          </View>
        </View>
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentChallenge.question}</Text>
        </View>

        <View style={styles.optionsList}>
          {currentChallenge.options.map((opt, idx) => {
            const selected = selectedAnswer === idx;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => handleSelect(idx)}
                style={[
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                  selected && { borderColor: themeColor },
                ]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selected && { borderColor: themeColor, backgroundColor: themeColor },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
                <Text style={[styles.optionText, selected && { color: themeColor }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={selectedAnswer === null || loading}
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: selectedAnswer === null ? '#e7e5e4' : themeColor }]}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Answer</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setView('create')} style={styles.createLink} activeOpacity={0.7}>
          <Text style={[styles.createLinkText, { color: themeColor }]}>Create your own question</Text>
        </TouchableOpacity>
        {scoreAndHistory}
      </ScrollView>

      <View style={styles.scoreFooter}>
        <View style={styles.scoreFooterRow}>
          <Text style={styles.scoreFooterText}>You: {scores.self} correct</Text>
          <Text style={styles.scoreDividerDot}>•</Text>
          <Text style={styles.scoreFooterText}>
            {partnerName}: {scores.partner} correct
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  keyboardFlex: { flex: 1 },
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
  headerCounter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9a6070',
    fontFamily: 'Inter_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 28,
    paddingBottom: 32,
  },
  createScrollContent: { paddingBottom: 180 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'serif',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 32,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1A1A1A',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(26,26,26,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 52,
    borderRadius: 18,
    minWidth: 160,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  compactButton: { minWidth: 250 },
  resultButton: { minWidth: 160 },
  answerContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  resultFeedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 2,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  resultFeedbackTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  resultFeedbackSub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  questionCard: {
    minHeight: 112,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 0,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  askedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  askedTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  askedLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#9a6070',
  },
  questionText: {
    fontSize: 22,
    color: '#302a42',
    fontFamily: 'PlayfairDisplay_700Bold',
    lineHeight: 30,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  optionCardSelected: {
    borderWidth: 2,
    backgroundColor: '#fff5f7',
    shadowColor: '#a72f55',
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '600',
    lineHeight: 22,
    backgroundColor: 'transparent',
  },
  createLink: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  createLinkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreFooter: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0e5d8',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scoreFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scoreFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#231f20',
  },
  scoreDividerDot: {
    fontSize: 14,
    color: '#d1d5db',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#231f20',
    fontFamily: 'serif',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee4e7',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    shadowColor: '#39232d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  historyScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 13 },
  historyEyebrow: { color: '#bc9da9', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  historyTitle: { marginTop: 2, color: '#302a42', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 17 },
  historyScore: { flexShrink: 1, fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'right' },
  historyItem: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee4e7' },
  historyList: { maxHeight: 290 },
  historySummary: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyResultIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyQuestion: { flex: 1, color: '#4a4150', fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  historyDrawer: { borderRadius: 14, padding: 13, marginBottom: 13, backgroundColor: '#fbf7f8' },
  historyAnswerLabel: { color: '#a18f9a', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  historyAnswer: { marginTop: 3, color: '#4a4150', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  correctAnswer: { color: '#24965b' },
  noHistory: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee4e7', paddingVertical: 16, color: '#a18f9a', fontFamily: 'Inter_400Regular', fontSize: 12 },
});
