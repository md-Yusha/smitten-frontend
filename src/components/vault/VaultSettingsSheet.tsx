import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingLabel } from '@/constants/disappearingMessages';
import { smittenAlert } from '@/src/components/ui/SmittenAlertProvider';

type VaultSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  themeColor: string;
  vaultDisappearingAfterMs: number | null;
  onSave: (patch: { vaultDisappearingAfterMs?: number | null }) => void;
  bottomInset: number;
};

export function VaultSettingsSheet({
  visible,
  onClose,
  themeColor,
  vaultDisappearingAfterMs,
  onSave,
  bottomInset,
}: VaultSettingsSheetProps) {
  const [customTimeModalVisible, setCustomTimeModalVisible] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState('1');
  const [customTimeUnit, setCustomTimeUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  const handleSaveCustomDisappearing = () => {
    const val = parseInt(customTimeValue, 10);
    if (isNaN(val) || val <= 0) {
      smittenAlert({ title: 'Invalid time', message: 'Please enter a valid positive number', tone: 'error' });
      return;
    }
    
    let multiplier = 60 * 1000; // minutes
    if (customTimeUnit === 'hours') multiplier = 60 * 60 * 1000;
    else if (customTimeUnit === 'days') multiplier = 24 * 60 * 60 * 1000;
    
    const ttlMs = val * multiplier;
    Haptics.selectionAsync();
    onSave({ vaultDisappearingAfterMs: ttlMs });
    setCustomTimeModalVisible(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { paddingBottom: Math.max(bottomInset, 20) }]}>
          <View style={styles.grab} />
          <Text className="mb-1 font-serif text-2xl text-ink">Vault settings</Text>
          <Text className="mb-5 text-sm font-sans leading-5 text-muted">
            Choose how long new images stay in your vault.
          </Text>

          <Text className="mb-2 text-xs font-sans-bold uppercase tracking-widest text-muted">
            Disappearing images
          </Text>
          <Text className="mb-3 text-xs font-sans text-muted">Current: {formatDisappearingLabel(vaultDisappearingAfterMs)}</Text>
          <View className="mb-6 gap-2">
            {DISAPPEARING_MESSAGE_OPTIONS.map((opt) => {
              const selected = vaultDisappearingAfterMs === opt.ttlMs;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSave({ vaultDisappearingAfterMs: opt.ttlMs });
                  }}
                  style={[
                    styles.row,
                    {
                      borderColor: selected ? themeColor : 'rgba(26,26,26,0.1)',
                      backgroundColor: selected ? `${themeColor}12` : '#fff',
                    },
                  ]}
                >
                  <Text className="font-sans-semibold text-ink">{opt.label}</Text>
                  <Text className="mt-0.5 text-xs font-sans text-muted">{opt.subtitle}</Text>
                </Pressable>
              );
            })}

            {/* Custom Option Pill */}
            {(() => {
              const isCustom = vaultDisappearingAfterMs !== null && 
                !DISAPPEARING_MESSAGE_OPTIONS.some(opt => opt.ttlMs === vaultDisappearingAfterMs);
              
              return (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomTimeModalVisible(true);
                  }}
                  style={[
                    styles.row,
                    {
                      borderColor: isCustom ? themeColor : 'rgba(26,26,26,0.1)',
                      backgroundColor: isCustom ? `${themeColor}12` : '#fff',
                    },
                  ]}
                >
                  <Text className="font-sans-semibold text-ink">
                    {isCustom ? `Custom: ${formatDisappearingLabel(vaultDisappearingAfterMs)}` : 'Custom timer ⏱️'}
                  </Text>
                  <Text className="mt-0.5 text-xs font-sans text-muted">
                    Set a custom timing for images to disappear
                  </Text>
                </Pressable>
              );
            })()}
          </View>

          <Pressable onPress={onClose} className="items-center py-3">
            <Text className="font-sans-semibold text-muted">Done</Text>
          </Pressable>
        </View>
      </View>

      {/* Custom Disappearing Timer Modal */}
      <Modal
        visible={customTimeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCustomTimeModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomTimeModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true} onTouchEnd={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Custom Timer</Text>
            <Text style={styles.modalSub}>Set a custom disappearing duration for new images.</Text>
            
            <View style={styles.inputRow}>
              <TextInput
                value={customTimeValue}
                onChangeText={setCustomTimeValue}
                keyboardType="number-pad"
                style={styles.numberInput}
              />
              <View style={styles.unitSelector}>
                {['minutes', 'hours', 'days'].map((unit) => {
                  const isUnitSelected = customTimeUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => setCustomTimeUnit(unit as any)}
                      style={[
                        styles.unitPill,
                        isUnitSelected && { backgroundColor: themeColor, borderColor: themeColor }
                      ]}
                    >
                      <Text style={[styles.unitPillText, isUnitSelected && { color: '#fff', fontWeight: '700' }]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCustomTimeModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCustomDisappearing}
                style={[styles.saveBtn, { backgroundColor: themeColor }]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,26,0.45)' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
    maxHeight: '88%',
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 16,
  },
  row: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  numberInput: {
    width: 60,
    height: 44,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#fafaf9',
  },
  unitSelector: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  unitPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPillText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
