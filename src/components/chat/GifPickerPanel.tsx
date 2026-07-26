import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ChatGif } from '@/constants/chatPickerAssets';
import { SmittenColors } from '@/constants/smittenTheme';
import {
  fetchChatGifs,
  GIF_CATEGORY_QUERIES,
  hasRemoteGifSearch,
  remoteGifProvider,
} from '@/src/services/gifCatalog';

const WIN = Dimensions.get('window').width;
const PAD = 16;
const GAP = 10;
const COLS = 2;
const CELL_W = (WIN - PAD * 2 - GAP) / COLS;
const CELL_H = 118;

type Props = {
  themeColor: string;
  onPick: (url: string) => void;
  maxHeight?: number;
};

export const GifPickerPanel = React.memo(function GifPickerPanel({ themeColor, onPick, maxHeight = 260 }: Props) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('trending');
  const [gifs, setGifs] = useState<ChatGif[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteLive = hasRemoteGifSearch();
  const provider = remoteGifProvider();

  const loadGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const list = await fetchChatGifs(searchQuery, 40);
      setGifs(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cat = GIF_CATEGORY_QUERIES.find((c) => c.id === categoryId);
      const q = query.trim() || cat?.query || '';
      void loadGifs(q);
    }, query.trim() ? 400 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoryId, loadGifs]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatGif; index: number }) => (
      <TouchableOpacity
        onPress={() => onPick(item.url)}
        activeOpacity={0.9}
        style={[
          styles.cell,
          { marginRight: index % COLS === 0 ? GAP : 0 },
        ]}
      >
        <Image source={{ uri: item.url }} style={styles.cellImg} contentFit="cover" recyclingKey={item.id} />
      </TouchableOpacity>
    ),
    [onPick],
  );

  return (
    <View style={[styles.wrap, { height: maxHeight }]}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={SmittenColors.muted} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t.trim()) setCategoryId('trending');
          }}
          placeholder={remoteLive ? 'Search GIFs…' : 'Search built-in GIFs…'}
          placeholderTextColor="#9ca3af"
          className="ml-2 flex-1 font-sans text-[15px] text-ink"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={SmittenColors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {provider === 'giphy' && (
        <Text className="px-4 pb-1 text-[11px] font-sans text-muted">Powered by Giphy</Text>
      )}

      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="handled"
        >
          {GIF_CATEGORY_QUERIES.map((item) => {
            const selected = categoryId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setCategoryId(item.id);
                  setQuery('');
                }}
                activeOpacity={0.85}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: `${themeColor}24`,
                    borderColor: themeColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    { color: selected ? themeColor : '#1A1A1A' },
                  ]}
                  numberOfLines={1}
                  allowFontScaling
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && gifs.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={themeColor} />
        </View>
      ) : (
        <FlatList
          data={gifs}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          numColumns={COLS}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
          ListEmptyComponent={
            <Text className="py-8 text-center font-sans text-sm text-muted">No GIFs found</Text>
          }
        />
      )}
    </View>
  );
});

const CHIP_FONT = Platform.select({
  ios: 'Inter_600SemiBold',
  android: 'Inter_600SemiBold',
  default: 'System',
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PAD,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 14,
    backgroundColor: '#f5f5f4',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  chipsRow: {
    height: 46,
    marginBottom: 8,
    justifyContent: 'center',
  },
  chipsContent: {
    paddingHorizontal: PAD,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.18)',
    marginRight: 10,
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: CHIP_FONT,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: Platform.OS === 'android' ? 'normal' : '600',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  grid: { flex: 1 },
  gridContent: { paddingHorizontal: PAD, paddingBottom: 12 },
  cell: {
    width: CELL_W,
    height: CELL_H,
    marginBottom: GAP,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(26,26,26,0.08)',
  },
  cellImg: { width: '100%', height: '100%' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
