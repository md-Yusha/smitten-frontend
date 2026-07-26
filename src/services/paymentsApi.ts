import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, type ApiUser } from "./api";

const PENDING_PAYMENT_KEY = "smitten_pending_payment";

export type PendingPayment = {
  merchantOrderId: string;
  plan: "monthly" | "quarterly" | "yearly";
  amount: number;
};

export type InitiatePaymentResponse = {
  success: true;
  merchant_order_id: string;
  order_id: string;
  redirect_url: string;
  state: string;
};

export type VerifyPaymentResponse = {
  success: true;
  state: "PENDING" | "COMPLETED" | "FAILED";
  merchant_order_id: string;
  invite_code?: string | null;
  user?: ApiUser;
};

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 36;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const paymentsApi = {
  /** Public — no auth required. */
  getConfig() {
    return apiRequest<{
      phonepeConfigured: boolean;
      redirectUrl: string | null;
      redirectIsHttps: boolean;
      pollOnlyMode: boolean;
      redirectError: string | null;
      sandboxUsesCardFlow: boolean;
    }>("/payments/config", { auth: false });
  },

  async getStatus() {
    return apiRequest<{
      status: string;
      plan: string | null;
      expiresAt: string | null;
      phonepeConfigured: boolean;
    }>("/payments/status");
  },

  initiate(plan: "monthly" | "quarterly" | "yearly") {
    return apiRequest<InitiatePaymentResponse>("/payments/initiate", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },

  verify(merchantOrderId: string) {
    return apiRequest<VerifyPaymentResponse>(
      `/payments/verify/${encodeURIComponent(merchantOrderId)}`,
    );
  },

  /** Local dev only — skips PhonePe when server has no credentials. */
  mockCheckout(plan: "monthly" | "quarterly" | "yearly") {
    return apiRequest<{ ok: boolean; inviteCode: string; user: ApiUser }>(
      "/payments/mock-checkout",
      {
        method: "POST",
        body: JSON.stringify({ plan }),
      },
    );
  },

  async savePendingPayment(data: PendingPayment) {
    await AsyncStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(data));
  },

  async loadPendingPayment(): Promise<PendingPayment | null> {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingPayment;
    } catch {
      return null;
    }
  },

  async clearPendingPayment() {
    await AsyncStorage.removeItem(PENDING_PAYMENT_KEY);
  },

  async pollUntilSettled(
    merchantOrderId: string,
  ): Promise<VerifyPaymentResponse> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      const result = await this.verify(merchantOrderId);
      if (result.state === "COMPLETED" || result.state === "FAILED") {
        return result;
      }
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await sleep(POLL_INTERVAL_MS);
      }
    }
    return this.verify(merchantOrderId);
  },
};
