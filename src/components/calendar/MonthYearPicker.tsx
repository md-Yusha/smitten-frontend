import { Ionicons } from '@expo/vector-icons';
import { smittenGlassButton } from '@/src/components/ui/glassButtonStyles';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

function clampYear(value: number) {
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, value));
}

export function MonthYearPicker({
  visible,
  month,
  year,
  onClose,
  onSelect,
}: {
  visible: boolean;
  month: number;
  year: number;
  onClose: () => void;
  onSelect: (month: number, year: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftYear, setDraftYear] = useState(String(year));

  useEffect(() => {
    if (!visible) return;
    setDraftMonth(month);
    setDraftYear(String(year));
  }, [month, visible, year]);

  const yearNumber = clampYear(Number(draftYear) || year);
  const changeYear = (amount: number) => setDraftYear(String(clampYear(yearNumber + amount)));
  const apply = () => {
    onSelect(draftMonth, yearNumber);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Jump to a date</Text>
              <Text style={styles.subtitle}>Choose a month and year</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color="#846f79" />
            </TouchableOpacity>
          </View>

          <View style={styles.yearCard}>
            <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearArrow}>
              <Ionicons name="chevron-back" size={21} color="#2b1b25" />
            </TouchableOpacity>
            <View style={styles.yearInputWrap}>
              <Text style={styles.yearLabel}>YEAR</Text>
              <TextInput
                value={draftYear}
                onChangeText={(value) => setDraftYear(value.replace(/\D/g, '').slice(0, 4))}
                onBlur={() => setDraftYear(String(yearNumber))}
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={4}
                style={styles.yearInput}
              />
            </View>
            <TouchableOpacity onPress={() => changeYear(1)} style={styles.yearArrow}>
              <Ionicons name="chevron-forward" size={21} color="#2b1b25" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((name, index) => {
              const active = draftMonth === index;
              return (
                <TouchableOpacity key={name} onPress={() => setDraftMonth(index)} style={[styles.monthButton, active && styles.monthButtonActive]}>
                  <Text style={[styles.monthText, active && styles.monthTextActive]}>{name.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => {
                const now = new Date();
                setDraftMonth(now.getMonth());
                setDraftYear(String(now.getFullYear()));
              }}
              style={styles.todayButton}
            >
              <Text style={styles.todayText}>This month</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={apply} style={styles.applyButton}>
              <Text style={styles.applyText}>Show {MONTHS[draftMonth]} {yearNumber}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(40,23,31,0.28)' },
  sheet: { paddingHorizontal: 22, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#fff' },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#e3d6dc', marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  subtitle: { marginTop: 3, color: '#9e8a94', fontFamily: 'Inter_400Regular', fontSize: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf1f4' },
  yearCard: { height: 76, marginTop: 20, borderRadius: 22, borderWidth: 1, borderColor: '#eddee3', backgroundColor: '#fffafb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  yearArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8edf1' },
  yearInputWrap: { alignItems: 'center' },
  yearLabel: { color: '#aa939e', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  yearInput: { minWidth: 100, height: 42, padding: 0, color: '#2b1b25', fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  monthButton: { width: '22.8%', height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee1e5', backgroundColor: '#fff' },
  monthButtonActive: { borderColor: '#e56582', backgroundColor: '#e56582' },
  monthText: { color: '#8f7b85', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  monthTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  todayButton: { height: 54, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ead9df', backgroundColor: '#fff' },
  todayText: { color: '#a14f67', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  applyButton: { ...smittenGlassButton, flex: 1, height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  applyText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
});
