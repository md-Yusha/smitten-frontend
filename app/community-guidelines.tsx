import { SupportDocumentScreen } from '@/src/components/support/SupportDocumentScreen';
import React from 'react';

export default function CommunityGuidelinesScreen() {
  return (
    <SupportDocumentScreen
      headerTitle="Community Guidelines"
      titleSuffix=" — Community Guidelines"
      subtitle="Being a Good Member of the Smittenz Community"
      intro="Welcome to the Smittenz Community — a space built for couples to connect, share, and grow closer together. Every member plays a part in keeping it safe, respectful, and meaningful. Here's what it means to be a good Smittenz user."
      sections={[
        {
          title: 'Our Guidelines',
          body:
            '1. Lead With Kindness\nEvery interaction on Smittenz — with your partner, and with our support team — should come from a place of kindness, patience, and respect. Disagreements happen, but cruelty, manipulation, or emotional harm have no place in the Smittenz Community.\n\n2. Adults Only — Strictly 18+\nSmittenz is built exclusively for adults. By using the app, you confirm that you are at least 18 years old and legally recognized as an adult in your jurisdiction. Creating an account with false age information, or allowing a minor to access or use your account, is a serious violation and will result in immediate account termination.\n\n3. Respect Your Partner\'s Boundaries\nUse Chat, Vault, Diary, Memory Lane, and Couple Games in ways that respect your partner\'s comfort and consent. Never pressure your partner into sharing content — photos, messages, or personal entries — they aren\'t comfortable sharing.\n\n4. Abide by the Laws of Your Jurisdiction\nAs a member of the Smittenz Community, you\'re responsible for using the app in compliance with all applicable laws of your jurisdiction — including laws relating to privacy, data protection, consent, and content sharing. Smittenz does not permit any use of the app that violates local, state, or national law.\n\n5. No Unauthorized Sharing of Content\nContent shared within your Couple Account is private between you and your partner. Do not screenshot, download, or share this content with third parties without your partner\'s explicit consent.\n\n6. Passkey Integrity\nYour passkey belongs to one couple only. Sharing it with anyone outside your relationship — even a friend "just trying it out" — goes against the spirit of the Smittenz Community and violates our Terms and Conditions.\n\n7. No Harassment, Abuse, or Exploitation\nHarassment, threats, coercion, stalking, or exploitative content of any kind — including anything involving a minor — is strictly prohibited and will result in immediate action against the account.\n\n8. No Impersonation or Misrepresentation\nBe honest about who you are. Don\'t misrepresent your identity, age, or relationship status within the app.\n\n9. Respect Privacy Beyond the App\nInformation, photos, or conversations shared on Smittenz should never be used to harass, blackmail, stalk, or harm your partner or anyone else — during the relationship or after it ends.',
        },
        {
          title: 'Reporting',
          body:
            "If something doesn't feel right — whether it's how the app is being used, a concern about your partner's behavior, or a violation of our Community Guidelines — please tell us. You don't have to face it alone.\n\nYour report is always treated with confidentiality and care. We understand that reaching out about a relationship or personal matter isn't easy, and we're here to listen without judgment.\n\nTo report a concern, click [E-mail] and share as much as you're comfortable with. We aim to respond within 5 working days.",
        },
        {
          title: 'Impact',
          body:
            "We take our Community Guidelines seriously, and every report is reviewed carefully. Depending on the nature of the concern, we may reach out for more information, restrict certain account features, or take further action to help keep you and the Smittenz Community safe — always in line with applicable law.\n\nIf you're in immediate danger or at risk of harm, please reach out to local emergency services or a trusted support helpline in your area — we're here to support you, but we're not a substitute for emergency help.",
        },
        {
          title: 'Limitation of Liability',
          body:
            "Smittenz provides a platform for couples to connect and share — we do not control, supervise, or guarantee the conduct of any user, including the actions of a subscriber's partner. Users are solely responsible for their own conduct and for how they interact with their partner, both within and outside the app.\n\nWhere any of these Community Guidelines are not followed or are violated by a user, Smittenz, to the extent permitted by applicable law, shall not be held liable or responsible for any resulting loss, harm, damage, or dispute — including but not limited to misuse of shared content, unauthorized sharing of the passkey, harassment, or any other breach of these guidelines by a partner or user. This limitation applies to the fullest extent permitted under applicable law and is without prejudice to any rights or remedies available to affected users under law.",
        },
      ]}
      footer="These Community Guidelines work alongside our Terms and Conditions and Privacy Policy. For any questions, click [E-mail]."
    />
  );
}
