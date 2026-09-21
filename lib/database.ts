import { createClient } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

export type TraderSettings = {
  user_id: string;
  default_market?: string | null;
  default_symbol?: string | null;
  default_timeframe?: string | null;
  trading_style?: string | null;
  risk_level?: string | null;
  language?: string | null;
  notifications_enabled?: boolean;
};

export type AnalysisHistoryItem = {
  id: string;
  user_id: string;
  market?: string | null;
  symbol?: string | null;
  timeframe?: string | null;
  signal?: string | null;
  confidence?: number | null;
  entry?: string | number | null;
  stop_loss?: string | number | null;
  tp1?: string | number | null;
  tp2?: string | number | null;
  tp3?: string | number | null;
  analysis?: unknown;
  created_at?: string;
};

export type FavoriteMarket = {
  id: string;
  user_id: string;
  market: string;
  symbol: string;
  created_at?: string;
};

/* =========================================================
   SUBSCRIPTION / USAGE
   Steps: 49, 50, 51, 54, 56
========================================================= */

export type SubscriptionPlan =
  | "free"
  | "basic"
  | "starter"
  | "pro"
  | "elite"
  | "elite_yearly";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "past_due"
  | "trialing";

export type UserSubscription = {
  id?: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  monthly_limit?: number | null;
  analyses_used?: number | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  payment_provider?: string | null;
  payment_subscription_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UsageRecord = {
  id?: string;
  user_id: string;
  period_start?: string | null;
  period_end?: string | null;
  analyses_used?: number;
  daily_analyses_used?: number;
  created_at?: string;
  updated_at?: string;
};

/* =========================================================
   ACCURACY / PERFORMANCE
   Steps: 104, 105
========================================================= */

export type SignalResult =
  | "pending"
  | "correct"
  | "wrong"
  | "target_hit"
  | "stop_loss_hit";

export type AccuracyRecord = {
  id?: string;
  user_id: string;
  analysis_id?: string | null;
  market?: string | null;
  symbol?: string | null;
  signal?: string | null;
  entry?: string | number | null;
  stop_loss?: string | number | null;
  tp1?: string | number | null;
  tp2?: string | number | null;
  tp3?: string | number | null;
  result?: SignalResult;
  profit_loss?: number | null;
  created_at?: string;
  resolved_at?: string | null;
};

export type PerformanceSummary = {
  total_signals: number;
  correct_signals: number;
  wrong_signals: number;
  target_hits: number;
  stop_loss_hits: number;
  pending_signals: number;
  win_rate: number;
  average_rr: number;
  buy_count: number;
  sell_count: number;
  wait_count: number;
};

/* =========================================================
   PAPER TRADING
   Step: 107
========================================================= */

export type PaperTrade = {
  id?: string;
  user_id: string;
  analysis_id?: string | null;
  market?: string | null;
  symbol?: string | null;
  side?: "BUY" | "SELL";
  quantity?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  status?: "open" | "closed" | "cancelled";
  profit_loss?: number | null;
  created_at?: string;
  closed_at?: string | null;
};

/* =========================================================
   ADMIN / SYSTEM
   Step: 109
========================================================= */

export type AdminSystemLog = {
  id?: string;
  user_id?: string | null;
  event_type: string;
  message?: string | null;
  metadata?: unknown;
  created_at?: string;
};

export type AdminStats = {
  total_users: number;
  total_analyses: number;
  total_favorites: number;
  active_subscriptions: number;
};

/* =========================================================
   BACKUP
   Step: 111
========================================================= */

export type BackupRecord = {
  id?: string;
  backup_type: string;
  status: "started" | "completed" | "failed";
  file_path?: string | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

/* =========================================================
   REFERRAL
   Step: 115
========================================================= */

export type ReferralRecord = {
  id?: string;
  referrer_user_id: string;
  referred_user_id?: string | null;
  referral_code: string;
  status?: "pending" | "completed" | "rewarded";
  reward?: string | null;
  created_at?: string;
};

/* =========================================================
   COUPON
   Step: 116
========================================================= */

export type CouponRecord = {
  id?: string;
  code: string;
  discount_percent?: number | null;
  discount_amount?: number | null;
  max_uses?: number | null;
  used_count?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  active?: boolean;
  created_at?: string;
};

/* =========================================================
   ANALYTICS
   Step: 118
========================================================= */

export type AnalyticsEvent = {
  id?: string;
  user_id?: string | null;
  event_name: string;
  market?: string | null;
  symbol?: string | null;
  metadata?: unknown;
  created_at?: string;
};

/* =========================================================
   CURRENT USER
========================================================= */

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // An unauthenticated request is an expected state for protected APIs.
    // Return null so the API route can respond with 401 instead of 500.
    const errorCode = (error as { code?: string }).code;
    const errorName = (error as { name?: string }).name;
    const errorMessage = error.message?.toLowerCase() ?? "";

    const isMissingSession =
      errorCode === "session_not_found" ||
      errorName === "AuthSessionMissingError" ||
      errorMessage.includes("auth session missing") ||
      errorMessage.includes("session missing");

    if (isMissingSession) {
      return null;
    }

    throw error;
  }

  return user;
}

/* =========================================================
   PROFILE
========================================================= */

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserProfile(
  profile: Partial<UserProfile>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        name: profile.name ?? null,
        email: profile.email ?? user.email ?? null,
        avatar_url: profile.avatar_url ?? null,
      },
      {
        onConflict: "id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   TRADER SETTINGS
========================================================= */

export async function getTraderSettings(): Promise<TraderSettings | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("trader_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTraderSettings(
  settings: Partial<TraderSettings>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("trader_settings")
    .upsert(
      {
        user_id: user.id,
        ...settings,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   ANALYSIS HISTORY
========================================================= */

export async function saveAnalysis(
  analysis: Omit<AnalysisHistoryItem, "id" | "user_id" | "created_at">
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("analysis_history")
    .insert({
      user_id: user.id,
      ...analysis,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAnalysisHistory(
  limit = 50
): Promise<AnalysisHistoryItem[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("analysis_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAnalysisById(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("analysis_history")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   FAVORITES
========================================================= */

export async function getFavorites(): Promise<FavoriteMarket[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addFavorite(
  market: string,
  symbol: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("favorites")
    .upsert(
      {
        user_id: user.id,
        market,
        symbol,
      },
      {
        onConflict: "user_id,market,symbol",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeFavorite(
  market: string,
  symbol: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("market", market)
    .eq("symbol", symbol);

  if (error) {
    throw error;
  }

  return true;
}

export async function isFavorite(
  market: string,
  symbol: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("market", market)
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/* =========================================================
   SUBSCRIPTION
   Steps: 49, 50, 51, 54, 56
========================================================= */

export async function getUserSubscription(): Promise<UserSubscription | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertUserSubscription(
  subscription: Omit<UserSubscription, "user_id">
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        ...subscription,
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   USAGE LIMIT
   Step: 50
========================================================= */

export async function getUserUsage(): Promise<UsageRecord | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("usage_records")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function incrementAnalysisUsage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const current = await getUserUsage();

  const nextUsage = (current?.analyses_used ?? 0) + 1;

  const { data, error } = await supabase
    .from("usage_records")
    .upsert(
      {
        user_id: user.id,
        analyses_used: nextUsage,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   ACCURACY
   Step: 104
========================================================= */

export async function saveAccuracyRecord(
  record: Omit<AccuracyRecord, "user_id">
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("accuracy_records")
    .insert({
      user_id: user.id,
      ...record,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccuracyRecord(
  id: string,
  updates: Partial<AccuracyRecord>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("accuracy_records")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccuracyRecords(
  limit = 100
): Promise<AccuracyRecord[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("accuracy_records")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* =========================================================
   PERFORMANCE
   Step: 105
========================================================= */

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const records = await getAccuracyRecords(1000);

  const total = records.length;

  const correct = records.filter(
    (r) => r.result === "correct"
  ).length;

  const wrong = records.filter(
    (r) => r.result === "wrong"
  ).length;

  const targetHits = records.filter(
    (r) => r.result === "target_hit"
  ).length;

  const stopLossHits = records.filter(
    (r) => r.result === "stop_loss_hit"
  ).length;

  const pending = records.filter(
    (r) => r.result === "pending"
  ).length;

  const buy = records.filter(
    (r) => r.signal?.toUpperCase() === "BUY"
  ).length;

  const sell = records.filter(
    (r) => r.signal?.toUpperCase() === "SELL"
  ).length;

  const wait = records.filter(
    (r) => r.signal?.toUpperCase() === "WAIT"
  ).length;

  const resolved = correct + wrong + targetHits + stopLossHits;

  const winRate =
    resolved > 0
      ? ((correct + targetHits) / resolved) * 100
      : 0;

  return {
    total_signals: total,
    correct_signals: correct,
    wrong_signals: wrong,
    target_hits: targetHits,
    stop_loss_hits: stopLossHits,
    pending_signals: pending,
    win_rate: Number(winRate.toFixed(2)),
    average_rr: 0,
    buy_count: buy,
    sell_count: sell,
    wait_count: wait,
  };
}

/* =========================================================
   PAPER TRADING
   Step: 107
========================================================= */

export async function createPaperTrade(
  trade: Omit<PaperTrade, "user_id">
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("paper_trades")
    .insert({
      user_id: user.id,
      ...trade,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPaperTrades(
  limit = 100
): Promise<PaperTrade[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("paper_trades")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updatePaperTrade(
  id: string,
  updates: Partial<PaperTrade>
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("paper_trades")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   ADMIN SYSTEM LOGS
   Step: 109
========================================================= */

export async function createAdminSystemLog(
  log: Omit<AdminSystemLog, "id" | "created_at">
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_system_logs")
    .insert(log)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAdminSystemLogs(
  limit = 100
): Promise<AdminSystemLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_system_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* =========================================================
   BACKUP RECORDS
   Step: 111
========================================================= */

export async function createBackupRecord(
  backup: Omit<BackupRecord, "id" | "created_at">
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backup_records")
    .insert(backup)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBackupRecord(
  id: string,
  updates: Partial<BackupRecord>
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backup_records")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   REFERRALS
   Step: 115
========================================================= */

export async function createReferral(
  referral: Omit<ReferralRecord, "id" | "created_at">
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("referrals")
    .insert(referral)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserReferrals(): Promise<ReferralRecord[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/* =========================================================
   COUPONS
   Step: 116
========================================================= */

export async function getCoupon(
  code: string
): Promise<CouponRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   ANALYTICS
   Step: 118
========================================================= */

export async function recordAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "created_at">
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analytics_events")
    .insert(event)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserAnalyticsEvents(
  limit = 100
): Promise<AnalyticsEvent[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
  
}
