import { SupportDocumentScreen } from '@/src/components/support/SupportDocumentScreen';
import React from 'react';

const sections = [
  {
    title: '1. Using Smittenz',
    body:
      'Smittenz provides a private space for couples to communicate and share content. By creating an account or using the app, you agree to these Terms and our Privacy Policy. If you do not agree, do not use Smittenz.',
  },
  {
    title: '2. Eligibility and your account',
    body:
      'You must be at least 18 years old and legally able to enter into these Terms. Provide accurate account information, keep your password and sign-in credentials secure, and tell us promptly if you suspect unauthorized access. You are responsible for activity performed through your account.',
  },
  {
    title: '3. Couple connections and shared content',
    body:
      'Only connect with a partner you intend to share a couple space with. You are responsible for choosing what to share and for respecting each other’s consent and boundaries. Do not access, copy, distribute, or use another person’s content without their permission. Content visibility may depend on the feature and settings you select.',
  },
  {
    title: '4. Acceptable use',
    body:
      'Use Smittenz lawfully and respectfully. Do not use the app to harass, threaten, exploit, impersonate, defraud, or harm anyone; violate another person’s rights or privacy; upload unlawful or malicious material; interfere with app security or operation; or help someone else do any of these things. Our Community Guidelines also apply.',
  },
  {
    title: '5. Your content',
    body:
      'You retain your rights to content you create or upload. You give Smittenz permission to host, store, process, and display that content only as needed to provide and maintain the features you use, including sharing it with your connected partner when you choose a shared feature. You confirm that you have the rights and permissions needed to submit the content.',
  },
  {
    title: '6. Subscriptions and payments',
    body:
      'Some features may require a paid subscription. The price, subscription period, payment method, renewal, cancellation, and refund terms are shown in the applicable purchase flow or platform. Payments may be processed by third-party providers, whose terms may also apply. We do not receive or store your full payment credentials.',
  },
  {
    title: '7. Availability and changes',
    body:
      'We work to keep Smittenz available, but features may change, be interrupted, or become unavailable. We may update the app or these Terms as the service evolves or as legal and safety requirements change. Where required, we will provide notice of material changes. Continued use after updated Terms take effect means you accept them.',
  },
  {
    title: '8. Suspension and account deletion',
    body:
      'You can stop using Smittenz and request account deletion through the app’s account settings. We may restrict or suspend access when reasonably necessary to protect users, investigate suspected misuse, enforce these Terms, or comply with law. Deletion and retention are handled as described in our Privacy Policy and subject to applicable legal requirements.',
  },
  {
    title: '9. Third-party services',
    body:
      'Smittenz may rely on third-party services for hosting, payments, email, notifications, media, or other features. Those services may be subject to their own terms and privacy notices. We are not responsible for third-party services that we do not operate.',
  },
  {
    title: '10. Disclaimers and liability',
    body:
      'To the extent permitted by law, Smittenz is provided on an “as is” and “as available” basis. We do not guarantee uninterrupted service or the conduct of any user, including a partner. Nothing in these Terms excludes rights or remedies that cannot legally be excluded. To the extent permitted by applicable law, Smittenz is not liable for indirect or consequential loss arising from use of the app.',
  },
  {
    title: '11. Contact',
    body:
      'For questions about these Terms, contact Smittenz support through Contact & Support in Profile.',
  },
];

export default function TermsAndConditionsScreen() {
  return (
    <SupportDocumentScreen
      headerTitle="Terms & Conditions"
      intro="Please read these Terms before using Smittenz. They explain the basic rules for your account, shared content, and use of the app."
      sections={sections}
      notice="This in-app summary is not a substitute for legal advice. Have counsel review these Terms for the jurisdictions where Smittenz is offered."
    />
  );
}
