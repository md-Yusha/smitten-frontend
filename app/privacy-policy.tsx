import { SupportDocumentScreen } from '@/src/components/support/SupportDocumentScreen';
import React from 'react';

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
      'For privacy, account security, deletion, or grievance requests, contact Smittenz support through Contact & Support in Profile.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SupportDocumentScreen
      headerTitle="Privacy Policy"
      updatedAt="June 29, 2026"
      intro="We built Smittenz for private couple moments. This policy is written to be clear about what the app handles and how you can control it."
      sections={sections}
      notice="This in-app policy is a practical privacy notice for users. For launch in a specific jurisdiction, have counsel review it against your final data flows and legal entity details."
    />
  );
}
