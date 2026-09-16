import type { ChatPickerAsset } from '@/constants/chatPickerAssets';
import { SmittenColors } from '@/constants/smittenTheme';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Category = { id: string; label: string };

type Props = {
  categories: readonly Category[];
  assets: readonly ChatPickerAsset[];
  onPick: (body: string) => void;
  maxHeight: number;
  columns: number;
  cellSize: number;
  gap: number;
  padding?: number;
};

export const CategorizedAssetPicker = React.memo(function CategorizedAssetPicker({
  categories,
  assets,
  onPick,
  maxHeight,
  columns,
  cellSize,
  gap,
  padding = 16,
}: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');

  const filteredAssets = useMemo(
    () => assets.filter((asset) => asset.category === categoryId),
    [assets, categoryId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatPickerAsset }) => (
      <TouchableOpacity
        onPress={() => onPick(item.body)}
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            marginBottom: gap,
          },
        ]}
      >
        {'unicode' in item && item.unicode ? (
          <Text style={{ fontSize: Math.min(28, cellSize * 0.72) }}>{item.unicode}</Text>
        ) : item.remoteUri ? (
          <Image
            source={{ uri: item.remoteUri }}
            style={{ width: cellSize - 14, height: cellSize - 14 }}
            contentFit="contain"
            recyclingKey={item.id}
          />
        ) : item.source ? (
          <Image
            source={item.source}
            style={{ width: cellSize - 14, height: cellSize - 14 }}
            contentFit="contain"
            recyclingKey={item.id}
          />
        ) : null}
      </TouchableOpacity>
    ),
    [cellSize, gap, onPick],
  );

  return (
    <View style={{ maxHeight }}>
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="handled"
        >
          {categories.map((category) => {
            const active = category.id === categoryId;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={columns}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        style={{ flexGrow: 0 }}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: 8, paddingBottom: 12 }}
        initialNumToRender={24}
        windowSize={7}
        maxToRenderPerBatch={24}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  chipsRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,26,26,0.08)',
  },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(240, 90, 40, 0.12)',
    borderColor: SmittenColors.accentBrand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: SmittenColors.ink,
  },
  chipTextActive: {
    color: SmittenColors.accentBrand,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
});
