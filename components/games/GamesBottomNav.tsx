import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GamesBottomNavProps = {
  activeTab?: 'index' | 'chat' | 'memories' | 'profile';
  onNavigate: (href: string) => void;
};

export function GamesBottomNav({ activeTab = 'index', onNavigate }: GamesBottomNavProps) {
  const insets = useSafeAreaInsets();

  const navItem = (
    name: 'index' | 'chat' | 'memories' | 'profile',
    label: string,
    outline: keyof typeof Ionicons.glyphMap,
    filled: keyof typeof Ionicons.glyphMap,
  ) => {
    const focused = activeTab === name;
    return (
      <TouchableOpacity
        key={name}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.selectionAsync();
          onNavigate(name === 'index' ? '/(tabs)' : `/(tabs)/${name === 'profile' ? 'profile' : name}`);
        }}
        style={styles.tabItem}
      >
        <Ionicons name={focused ? filled : outline} size={21} color={focused ? '#E8536E' : '#c8b9c0'} />
        <Text style={[styles.tabLabel, focused && { color: '#E8536E' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          height: (Platform.OS === 'ios' ? 78 : 66) + Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.inner}>
        {navItem('index', 'Home', 'home-outline', 'home')}
        {navItem('chat', 'Chat', 'chatbubble-outline', 'chatbubble')}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNavigate('/(tabs)');
          }}
          style={styles.centerButtonWrapper}
        >
          <View style={styles.centerButton}>
            <Image
              source={require('../../assets/images/tab_icon.jpeg')}
              style={styles.centerButtonImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {navItem('memories', 'Memories', 'images-outline', 'images')}
        {navItem('profile', 'Profile', 'person-outline', 'person')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ececec',
    shadowColor: '#7a2a45',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 12,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    paddingVertical: 6,
  },
  tabLabel: {
    marginTop: 4,
    color: '#c8b9c0',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  centerButtonWrapper: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8536E',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#E8536E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  centerButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
});
