import { SmittenColors } from '@/constants/smittenTheme';
import { SupportDocumentScreen } from '@/src/components/support/SupportDocumentScreen';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PLAN_ROWS = [
  { plan: 'Monthly', price: '₹99' },
  { plan: 'Quarterly', price: '₹199' },
  { plan: 'Yearly', price: '₹599' },
];

export default function FaqScreen() {
  return (
    <SupportDocumentScreen
      headerTitle="FAQ"
      sections={[
        {
          title: 'General',
          children: (
            <>
              <FaqItem
                question="Q1: What is Smittenz?"
                answer="Smittenz is a mobile app designed for couples to connect, share memories, and enjoy features built for two people in a relationship."
              />
              <FaqItem
                question="Q2: Is there an age requirement to use Smittenz?"
                answer="Yes. Users must be at least 18 years old to use Smittenz."
              />
              <FaqItem
                question="Q3: Where can I read about what data Smittenz collects and how it's used?"
                answer="Please refer to our Terms and Conditions and Privacy Policy for detailed information on data collection, usage, and storage. These documents govern your use of the app and address any privacy-related queries."
              />
              <FaqItem
                question="Q4: Is Smittenz available outside India?"
                answer="Currently, Smittenz is available only in India."
                last
              />
            </>
          ),
        },
        {
          title: 'Subscription Plans',
          children: (
            <>
              <FaqItem
                question="Q5: What subscription plans does Smittenz offer?"
                answer="Smittenz offers three plans: Monthly at ₹99, Quarterly at ₹199, and Yearly at ₹599."
              />
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Plan</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, styles.tablePrice]}>Price</Text>
                </View>
                {PLAN_ROWS.map((row, index) => (
                  <View
                    key={row.plan}
                    style={[styles.tableRow, index === PLAN_ROWS.length - 1 && styles.tableRowLast]}
                  >
                    <Text style={styles.tableCell}>{row.plan}</Text>
                    <Text style={[styles.tableCell, styles.tablePrice]}>{row.price}</Text>
                  </View>
                ))}
              </View>
              <FaqItem
                question='Q6: Who is considered the "subscription owner"?'
                answer="The person who purchases the subscription is the subscription owner. The subscription owner receives a unique passkey which can be shared with their partner."
              />
              <FaqItem
                question="Q7: Can I choose any plan when I first subscribe?"
                answer="Yes. New subscribers are free to select the subscription plan of their choice — Monthly, Quarterly, or Yearly. On nearing the completion of the subscription period, subscribers can again select the subscription plan of their choice for renewal."
              />
              <FaqItem
                question="Q8: What happens when my subscription period is about to end?"
                answer="You'll receive a notification one week before your subscription period ends, informing you of the auto-debit amount and plan type. At this point, you can: cancel the subscription before auto-debit occurs, or pay for the subscription manually before the auto-debit date, or do nothing and let the auto-debit happen automatically."
                last
              />
            </>
          ),
        },
        {
          title: 'Passkey & Partner Sharing',
          children: (
            <>
              <FaqItem
                question="Q9: What is a passkey and how does it work?"
                answer="When you subscribe, you receive a passkey that you can share with one partner only. This links both of you as a couple within the app."
              />
              <FaqItem
                question="Q10: Can I share my passkey with more than one person?"
                answer="No. A single passkey is valid for only one couple — the subscription owner and the one partner they share it with. Neither the subscriber nor their partner is permitted to share the passkey with any third person."
              />
              <FaqItem
                question="Q11: What happens to the passkey/subscription if we separate?"
                answer="If the subscription owner and their partner separate, the partner cannot claim any leftover subscription period. The remaining subscription benefit stays tied to the subscription owner's account."
              />
              <FaqItem
                question="Q12: Does the partner need to pay separately to use the app?"
                answer="No. Only the subscription owner pays for the subscription. Once the owner shares the passkey, their partner can access the app's couple features without any separate payment."
                last
              />
            </>
          ),
        },
        {
          title: 'Account Deletion & Refunds',
          children: (
            <>
              <FaqItem
                question="Q13: If I delete my account, will I get a refund for the remaining subscription period?"
                answer="No refunds are provided for account deletion. However, your account (and the remaining subscription validity) stays open until the original subscription period ends."
              />
              <FaqItem
                question="Q14: If we deleted our account but want to come back, what happens?"
                answer="If the subscription owner and partner agree to resume using the app, they can continue using it for whatever remains of the original subscription period."
              />
              <FaqItem
                question="Q15: Will our old memories, chats, diary entries, and vault content be restored if we resume?"
                answer="No. If the account was deleted before the subscription period ended and the couple decides to start again, all previous data — including memories, diary entries, chats, vault content, and couple games progress — will need to be rebuilt from scratch. Nothing from before the deletion will be restored."
                last
              />
            </>
          ),
        },
        {
          title: 'Responsible Use',
          children: (
            <>
              <FaqItem
                question="Q16: Are there any guidelines on how to use Smittenz?"
                answer="Yes. Smittenz encourages all users to exercise caution and use the app responsibly. The app's features are meant to be enjoyed in good faith, and users should not engage in any unethical or inappropriate use of the platform."
              />
              <FaqItem
                question="Q17: Is Smittenz responsible if my partner or another user violates the Community Guidelines?"
                answer="No. Smittenz provides the platform for couples to connect but does not control, supervise, or guarantee the conduct of any user. If a user violates our Community Guidelines or Terms and Conditions — including misuse of the passkey, unauthorized sharing of content, harassment, or any other breach — Smittenz, to the extent permitted by applicable law, is not held liable for any resulting loss, harm, damage, or dispute. Users remain solely responsible for their own conduct and their interactions with their partner. Please refer to our Terms and Conditions for the complete limitation of liability."
                last
              />
            </>
          ),
        },
        {
          title: 'Contact & Support',
          body:
            "Q18: What if my question isn't answered here?\n\nIf you have any questions not covered in this FAQ, please click [E-mail]. Our team will respond within 5 working days.",
        },
      ]}
      footer="This FAQ is a general guide. For complete details on data usage, user rights, and legal terms, please refer to our Terms and Conditions and Privacy Policy."
    />
  );
}

function FaqItem({
  question,
  answer,
  last = false,
}: {
  question: string;
  answer: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.faqItem, !last && styles.faqItemBorder]}>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.answer}>{answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  faqItem: {
    paddingVertical: 12,
  },
  faqItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmittenColors.border,
  },
  question: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: SmittenColors.ink,
    marginBottom: 6,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  table: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SmittenColors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SmittenColors.border,
    backgroundColor: '#fff',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableHeader: {
    backgroundColor: '#fff',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  tableHeaderText: {
    fontWeight: '800',
    color: SmittenColors.ink,
  },
  tablePrice: {
    textAlign: 'right',
  },
});
