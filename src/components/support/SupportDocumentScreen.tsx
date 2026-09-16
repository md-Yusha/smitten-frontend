import { SmittenColors } from '@/constants/smittenTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SUPPORT_EMAIL = 'support.smittenz@commonhills.com';

type Section = {
  title: string;
  body?: string;
  children?: React.ReactNode;
};

type SupportDocumentScreenProps = {
  headerTitle: string;
  titleSuffix: string;
  subtitle?: string;
  intro?: string;
  sections: Section[];
  footer?: string;
};

export function EmailLink() {
  return (
    <Text
      style={styles.emailLink}
      onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      accessibilityRole="link"
    >
      [E-mail]
    </Text>
  );
}

export function BodyWithEmail({ children }: { children: string }) {
  const parts = children.split('[E-mail]');

  return (
    <Text style={styles.sectionBody}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 ? <EmailLink /> : null}
        </React.Fragment>
      ))}
    </Text>
  );
}

export function SupportDocumentScreen({
  headerTitle,
  titleSuffix,
  subtitle,
  intro,
  sections,
  footer,
}: SupportDocumentScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={SmittenColors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Image
            source={require('@/assets/images/logo_trans.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Smittenz"
          />
          <Text style={styles.titleSuffix}>{titleSuffix}</Text>
        </View>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body ? <BodyWithEmail>{section.body}</BodyWithEmail> : null}
            {section.children}
          </View>
        ))}

        {footer ? (
          <View style={styles.footerBox}>
            <BodyWithEmail>{footer}</BodyWithEmail>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SmittenColors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmittenColors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(253, 242, 240, 0.95)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SmittenColors.ink,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logo: {
    width: 118,
    height: 34,
  },
  titleSuffix: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: SmittenColors.ink,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: SmittenColors.ink,
  },
  intro: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 23,
    color: SmittenColors.ink,
  },
  section: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SmittenColors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SmittenColors.ink,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  emailLink: {
    color: SmittenColors.accentBrand,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footerBox: {
    marginTop: 24,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(240, 90, 40, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240, 90, 40, 0.24)',
  },
});
