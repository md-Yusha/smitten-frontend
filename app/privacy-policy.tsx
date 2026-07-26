import { SmittenColors } from '@/constants/smittenTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sections = [
  {
    title: '1. Who we are',
    body:
      'Smittenz is a private couple space for chat, memories, notes, vault photos, games, profile settings, subscriptions, and partner-only interactions. This policy explains what information we collect, why we use it, and the choices you have.',
  },
  {
    title: '2. Information we collect',
    body:
      'We collect the details you provide during registration and profile setup, including name, email address, phone number, city, date of birth, gender or identity details you choose to provide, partner-known date, profile photos, nicknames, moods, invite codes, and subscription status. We also process content you create in the app, such as messages, stickers, GIFs, media, notes, memories, vault items, special moments, quizzes, game activity, and app settings.',
  },
  {
    title: '3. Device permissions and local data',
    body:
      'Smittenz may ask for notification permission, photo library access, camera or media access, and biometric unlock depending on the feature you use. Biometric authentication is handled by your device operating system; Smittenz does not receive or store your fingerprint, face, or biometric template. Some settings and cached content may be stored locally on your device to keep the app fast and usable.',
  },
  {
    title: '4. How we use information',
    body:
      'We use information to create and secure your account, connect you with your partner, deliver chats and notifications, display shared memories and vault items, process subscriptions, prevent abuse, provide support, troubleshoot issues, maintain app reliability, and improve Smittenz features.',
  },
  {
    title: '5. Private couple content',
    body:
      'Your couple content is intended only for you and your connected partner. We use authentication, access controls, encrypted transport, and protected storage practices to help keep private content private. You should still avoid sharing content that you do not want your partner to see, save, or disclose.',
  },
  {
    title: '6. Payments and subscriptions',
    body:
      'Payment and subscription flows may be handled through payment providers such as PhonePe or app store/payment infrastructure where applicable. We receive payment status and subscription information needed to unlock paid access, but we do not store full card, UPI PIN, or banking credentials.',
  },
  {
    title: '7. Notifications, GIFs, and service providers',
    body:
      'We may use service providers for hosting, email OTPs, push notifications, media delivery, payment processing, and GIF search or display. These providers process information only as needed to provide their services. GIF searches or remote GIF content may be sent to the configured GIF provider.',
  },
  {
    title: '8. Sharing of information',
    body:
      'We do not sell your personal information. We may share information with your connected partner as part of the app, with service providers who help operate Smittenz, when required by law, to protect users and security, or during a business transfer such as a merger or acquisition.',
  },
  {
    title: '9. Retention and deletion',
    body:
      'We keep account and couple data for as long as needed to provide Smittenz, comply with legal obligations, resolve disputes, prevent abuse, and maintain backups. You can delete your account from Profile. Account deletion is designed to permanently remove your Smittenz account data and private content from active systems, subject to legal, security, payment, and backup retention requirements.',
  },
  {
    title: '10. Your choices and rights',
    body:
      'You can update profile details, manage notification settings, choose disappearing message settings, remove content where supported, disable app lock, restore the normal app icon, log out, or delete your account. Depending on applicable law, you may also request access, correction, deletion, withdrawal of consent, or grievance review by contacting support.',
  },
  {
    title: '11. Security',
    body:
      'We use reasonable technical and organizational safeguards to protect Smittenz, including authentication, token handling, access checks, protected media routes, encryption in transit, local app-lock options, and screenshot blocking where supported. No system is perfectly secure, so please use a strong password and keep your device protected.',
  },
  {
    title: '12. Children and safety',
    body:
      'Smittenz is not intended for children below the age required by applicable law to create an account or consent to digital services. If you believe a child has provided personal information without proper consent, contact support so we can review and act.',
  },
  {
    title: '13. Changes to this policy',
    body:
      'We may update this policy when Smittenz changes or when legal, security, or operational requirements change. If changes are material, we will take reasonable steps to notify users through the app or another appropriate method.',
  },
  {
    title: '14. Contact and grievance support',
    body:
      'For privacy, account security, deletion, or grievance requests, contact Smittenz support through the Help centre in Profile or WhatsApp support at +91 98805 12345.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
          style={styles.backBtn}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={SmittenColors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Smittenz Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: June 29, 2026</Text>
        <Text style={styles.intro}>
          We built Smittenz for private couple moments. This policy is written to be clear about what the app handles and how you can control it.
        </Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={20} color={SmittenColors.accentBrand} />
          <Text style={styles.noteText}>
            This in-app policy is a practical privacy notice for users. For launch in a specific jurisdiction, have counsel review it against your final data flows and legal entity details.
          </Text>
        </View>
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
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: SmittenColors.ink,
  },
  updated: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: SmittenColors.muted,
  },
  intro: {
    marginTop: 16,
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
  noteBox: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(240, 90, 40, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(240, 90, 40, 0.24)',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b4a3d',
  },
});
