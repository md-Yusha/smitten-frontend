import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingLabel } from '@/constants/disappearingMessages';
import { smittenAlert } from '@/src/components/ui/SmittenAlertProvider';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ChatSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  themeColor: string;
  chatDisappearingAfterMs: number | null;
  onSave: (patch: { chatDisappearingAfterMs?: number | null }) => void;
  bottomInset: number;
};

type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

function customParts(value: number): { value: string; unit: TimeUnit } {
  if (value % 86_400_000 === 0) return { value: String(value / 86_400_000), unit: 'days' };
  if (value % 3_600_000 === 0) return { value: String(value / 3_600_000), unit: 'hours' };
  if (value % 60_000 === 0) return { value: String(value / 60_000), unit: 'minutes' };
  return { value: String(Math.max(1, Math.round(value / 1000))), unit: 'seconds' };
}

export function ChatSettingsSheet({
  visible,
  onClose,
  themeColor,
  chatDisappearingAfterMs,
  onSave,
  bottomInset,
}: ChatSettingsSheetProps) {
  const isCustomValue = chatDisappearingAfterMs !== null && !DISAPPEARING_MESSAGE_OPTIONS.some((option) => option.ttlMs === chatDisappearingAfterMs);
  const [customOpen, setCustomOpen] = useState(isCustomValue);
  const [customTimeValue, setCustomTimeValue] = useState('1');
  const [customTimeUnit, setCustomTimeUnit] = useState<TimeUnit>('hours');

  useEffect(() => {
    if (!visible) return;
    const custom = chatDisappearingAfterMs !== null && !DISAPPEARING_MESSAGE_OPTIONS.some((option) => option.ttlMs === chatDisappearingAfterMs);
    setCustomOpen(custom);
    if (custom && chatDisappearingAfterMs) {
      const parts = customParts(chatDisappearingAfterMs);
      setCustomTimeValue(parts.value);
      setCustomTimeUnit(parts.unit);
    }
  }, [chatDisappearingAfterMs, visible]);

  const savePreset = (value: number | null) => {
    void Haptics.selectionAsync();
    setCustomOpen(false);
    onSave({ chatDisappearingAfterMs: value });
  };

  const saveCustom = () => {
    const amount = Number(customTimeValue);
    const multiplier = customTimeUnit === 'days'
      ? 86_400_000
      : customTimeUnit === 'hours'
        ? 3_600_000
        : customTimeUnit === 'minutes'
          ? 60_000
          : 1000;
    const ttlMs = Math.round(amount * multiplier);
    if (!Number.isFinite(ttlMs) || ttlMs < 5_000 || ttlMs > 365 * 86_400_000) {
      smittenAlert({ title: 'Choose a valid time', message: 'Use a timer between 5 seconds and 365 days.', tone: 'warning' });
      return;
    }
    void Haptics.selectionAsync();
    onSave({ chatDisappearingAfterMs: ttlMs });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 20) + 8 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chat timer</Text>
              <Text style={styles.subtitle}>Choose how long new messages stay.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color="#816d77" />
            </TouchableOpacity>
          </View>

          <View style={styles.currentCard}>
            <View style={styles.currentIcon}><Ionicons name="timer-outline" size={21} color="#9577dc" /></View>
            <View style={styles.currentCopy}>
              <Text style={styles.currentLabel}>CURRENT TIMER</Text>
              <Text style={styles.currentValue}>{formatDisappearingLabel(chatDisappearingAfterMs)}</Text>
            </View>
            <Ionicons name={chatDisappearingAfterMs === null ? 'infinite-outline' : 'hourglass-outline'} size={20} color="#b29da7" />
          </View>

          <Text style={styles.sectionLabel}>DISAPPEARING MESSAGES</Text>
          <View style={styles.options}>
            {DISAPPEARING_MESSAGE_OPTIONS.map((option) => {
              const selected = !customOpen && chatDisappearingAfterMs === option.ttlMs;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => savePreset(option.ttlMs)}
                  style={[styles.option, selected && { borderColor: themeColor, backgroundColor: themeColor }]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => { void Haptics.selectionAsync(); setCustomOpen(true); }} style={[styles.option, customOpen && { borderColor: themeColor, backgroundColor: themeColor }]}> 
              <Text style={[styles.optionText, customOpen && styles.optionTextSelected]}>Custom</Text>
            </TouchableOpacity>
          </View>

          {customOpen ? (
            <View style={styles.customCard}>
              <Text style={styles.customTitle}>Custom viewing time</Text>
              <Text style={styles.customHint}>Messages sent after saving will use this timer.</Text>
              <View style={styles.customRow}>
                <TextInput
                  value={customTimeValue}
                  onChangeText={(value) => setCustomTimeValue(value.replace(/[^0-9.]/g, '').slice(0, 7))}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor="#b9a8b0"
                  style={styles.numberInput}
                />
                <View style={styles.units}>
                  {(['seconds', 'minutes', 'hours', 'days'] as const).map((unit) => {
                    const selected = customTimeUnit === unit;
                    return (
                      <TouchableOpacity key={unit} onPress={() => setCustomTimeUnit(unit)} style={[styles.unit, selected && styles.unitSelected]}>
                        <Text style={[styles.unitText, selected && { color: themeColor }]}>{unit === 'seconds' ? 'Sec' : unit === 'minutes' ? 'Min' : unit === 'hours' ? 'Hr' : 'Day'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TouchableOpacity onPress={saveCustom} style={[styles.saveCustomButton, { backgroundColor: themeColor }]}> 
                <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                <Text style={styles.saveCustomText}>Apply custom timer</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.note}>The selected timer applies to new messages. Existing messages keep their original expiry time.</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneButton}>
            <Text style={[styles.doneText, { color: themeColor }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(40,23,31,0.28)' },
  sheet: { paddingHorizontal: 22, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#fff' },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#e3d6dc', marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  subtitle: { marginTop: 3, color: '#9d8993', fontFamily: 'Inter_400Regular', fontSize: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf1f4' },
  currentCard: { minHeight: 72, marginTop: 19, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#e8dff3', backgroundColor: '#f8f5fd', flexDirection: 'row', alignItems: 'center' },
  currentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ece5fa' },
  currentCopy: { flex: 1, paddingHorizontal: 12 },
  currentLabel: { color: '#9f8aa0', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  currentValue: { marginTop: 4, color: '#2b1b25', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  sectionLabel: { marginTop: 21, color: '#9f8994', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  option: { minWidth: 73, height: 39, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1, borderColor: '#eadbe0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  optionText: { color: '#8e7984', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  optionTextSelected: { color: '#fff' },
  customCard: { marginTop: 15, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#eddee3', backgroundColor: '#fffafb' },
  customTitle: { color: '#2b1b25', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  customHint: { marginTop: 3, color: '#a08d96', fontFamily: 'Inter_400Regular', fontSize: 11 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 },
  numberInput: { width: 78, height: 47, borderRadius: 15, borderWidth: 1, borderColor: '#ead8de', backgroundColor: '#fff', color: '#2b1b25', fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  units: { flex: 1, height: 47, padding: 4, borderRadius: 15, flexDirection: 'row', backgroundColor: '#f7eef1' },
  unit: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  unitSelected: { backgroundColor: '#fff' },
  unitText: { color: '#9a8790', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  saveCustomButton: { height: 48, marginTop: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveCustomText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  note: { marginTop: 16, color: '#a18e97', fontFamily: 'Inter_400Regular', fontSize: 10.5, lineHeight: 16, textAlign: 'center' },
  doneButton: { height: 46, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});
