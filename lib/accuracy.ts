import { createClient } from "@/lib/supabase/server";

export type SignalResult =
  | "correct"
  | "incorrect"
  | "neutral"
  | "pending";

export interface AccuracyRecord {
  id: string;
  userId: string;
  analysisId: string;
  symbol: string;
  timeframe: string;
  signal: string;
  confidence: number | null;
  result: SignalResult;
  entryPrice: number | null;
  evaluatedPrice: number | null;
  priceChangePercent: number | null;
  evaluatedAt: string | null;
  createdAt: string;
}

export interface AccuracyEvaluation {
  result: Exclude<SignalResult, "pending">;
  priceChangePercent: number;
}

export interface AccuracySummary {
  total: number;
  evaluated: number;
  correct: number;
  incorrect: number;
  neutral: number;
  pending: number;
  accuracyPercent: number | null;
}

const VALID_RESULTS: SignalResult[] = [
  "correct",
  "incorrect",
  "neutral",
  "pending",
];

const MAX_CONFIDENCE = 100;

function normalizeSignal(signal: string): string {
  return signal.trim().toUpperCase();
}

function isBuySignal(signal: string): boolean {
  return ["BUY", "LONG", "STRONG BUY"].includes(
    normalizeSignal(signal),
  );
}

function isSellSignal(signal: string): boolean {
  return ["SELL", "SHORT", "STRONG SELL"].includes(
    normalizeSignal(signal),
  );
}

function isNeutralSignal(signal: string): boolean {
  return ["HOLD", "NEUTRAL", "WAIT"].includes(
    normalizeSignal(signal),
  );
}

export function validateAccuracyRecordInput(input: {
  analysisId: string;
  symbol: string;
  timeframe: string;
  signal: string;
  confidence?: number | null;
  entryPrice?: number | null;
}): void {
  if (
    !input.analysisId ||
    input.analysisId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(input.analysisId)
  ) {
    throw new Error("Invalid analysis ID.");
  }

  if (
    !input.symbol ||
    input.symbol.length > 30 ||
    !/^[a-zA-Z0-9._/-]+$/.test(input.symbol)
  ) {
    throw new Error("Invalid symbol.");
  }

  if (
    !input.timeframe ||
    input.timeframe.length > 20
  ) {
    throw new Error("Invalid timeframe.");
  }

  if (
    !input.signal ||
    input.signal.length > 50
  ) {
    throw new Error("Invalid signal.");
  }

  if (
    input.confidence !== null &&
    input.confidence !== undefined &&
    (!Number.isFinite(input.confidence) ||
      input.confidence < 0 ||
      input.confidence > MAX_CONFIDENCE)
  ) {
    throw new Error("Confidence must be between 0 and 100.");
  }

  if (
    input.entryPrice !== null &&
    input.entryPrice !== undefined &&
    (!Number.isFinite(input.entryPrice) ||
      input.entryPrice <= 0)
  ) {
    throw new Error("Entry price must be greater than zero.");
  }
}

export function evaluateSignalAccuracy(
  signal: string,
  entryPrice: number,
  evaluatedPrice: number,
  neutralThresholdPercent = 0.1,
): AccuracyEvaluation {
  if (
    !Number.isFinite(entryPrice) ||
    entryPrice <= 0
  ) {
    throw new Error("Invalid entry price.");
  }

  if (
    !Number.isFinite(evaluatedPrice) ||
    evaluatedPrice <= 0
  ) {
    throw new Error("Invalid evaluated price.");
  }

  if (
    !Number.isFinite(neutralThresholdPercent) ||
    neutralThresholdPercent < 0 ||
    neutralThresholdPercent > 100
  ) {
    throw new Error("Invalid neutral threshold.");
  }

  const priceChangePercent =
    ((evaluatedPrice - entryPrice) / entryPrice) * 100;

  if (Math.abs(priceChangePercent) <= neutralThresholdPercent) {
    return {
      result: "neutral",
      priceChangePercent,
    };
  }

  if (isBuySignal(signal)) {
    return {
      result:
        priceChangePercent > 0
          ? "correct"
          : "incorrect",
      priceChangePercent,
    };
  }

  if (isSellSignal(signal)) {
    return {
      result:
        priceChangePercent < 0
          ? "correct"
          : "incorrect",
      priceChangePercent,
    };
  }

  if (isNeutralSignal(signal)) {
    return {
      result: "neutral",
      priceChangePercent,
    };
  }

  return {
    result: "neutral",
    priceChangePercent,
  };
}

export async function saveAccuracyRecord(input: {
  analysisId: string;
  symbol: string;
  timeframe: string;
  signal: string;
  confidence?: number | null;
  entryPrice?: number | null;
}): Promise<AccuracyRecord> {
  validateAccuracyRecordInput(input);

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase
    .from("accuracy_records")
    .insert({
      user_id: user.id,
      analysis_id: input.analysisId,
      symbol: input.symbol.toUpperCase(),
      timeframe: input.timeframe,
      signal: input.signal,
      confidence: input.confidence ?? null,
      result: "pending",
      entry_price: input.entryPrice ?? null,
      evaluated_price: null,
      price_change_percent: null,
      evaluated_at: null,
    })
    .select(
      "id, user_id, analysis_id, symbol, timeframe, signal, confidence, result, entry_price, evaluated_price, price_change_percent, evaluated_at, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      "Unable to save accuracy record.",
    );
  }

  return mapAccuracyRecord(data);
}

export async function updateAccuracyRecord(
  recordId: string,
  evaluatedPrice: number,
  neutralThresholdPercent = 0.1,
): Promise<AccuracyRecord> {
  const id = recordId.trim();

  if (
    !id ||
    id.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(id)
  ) {
    throw new Error("Invalid accuracy record ID.");
  }

  if (
    !Number.isFinite(evaluatedPrice) ||
    evaluatedPrice <= 0
  ) {
    throw new Error("Invalid evaluated price.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data: existing, error: fetchError } =
    await supabase
      .from("accuracy_records")
      .select(
        "id, user_id, analysis_id, symbol, timeframe, signal, confidence, result, entry_price, evaluated_price, price_change_percent, evaluated_at, created_at",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (fetchError || !existing) {
    throw new Error(
      "Accuracy record not found.",
    );
  }

  if (
    existing.entry_price === null ||
    existing.entry_price === undefined
  ) {
    throw new Error(
      "Accuracy record has no entry price.",
    );
  }

  const evaluation = evaluateSignalAccuracy(
    existing.signal,
    Number(existing.entry_price),
    evaluatedPrice,
    neutralThresholdPercent,
  );

  const { data, error } = await supabase
    .from("accuracy_records")
    .update({
      result: evaluation.result,
      evaluated_price: evaluatedPrice,
      price_change_percent:
        evaluation.priceChangePercent,
      evaluated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, analysis_id, symbol, timeframe, signal, confidence, result, entry_price, evaluated_price, price_change_percent, evaluated_at, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(
      "Unable to update accuracy record.",
    );
  }

  return mapAccuracyRecord(data);
}

export async function getAccuracyRecords(
  options: {
    symbol?: string;
    result?: SignalResult;
    limit?: number;
  } = {},
): Promise<AccuracyRecord[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const limit = Math.min(
    Math.max(
      Number.isInteger(options.limit)
        ? Number(options.limit)
        : 100,
      1,
    ),
    500,
  );

  let query = supabase
    .from("accuracy_records")
    .select(
      "id, user_id, analysis_id, symbol, timeframe, signal, confidence, result, entry_price, evaluated_price, price_change_percent, evaluated_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (options.symbol) {
    query = query.eq(
      "symbol",
      options.symbol.toUpperCase(),
    );
  }

  if (
    options.result &&
    VALID_RESULTS.includes(options.result)
  ) {
    query = query.eq(
      "result",
      options.result,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "Unable to load accuracy records.",
    );
  }

  return (data ?? []).map(mapAccuracyRecord);
}

export async function getPerformanceSummary(): Promise<AccuracySummary> {
  const records = await getAccuracyRecords({
    limit: 500,
  });

  const total = records.length;
  const evaluated = records.filter(
    (record) => record.result !== "pending",
  ).length;
  const correct = records.filter(
    (record) => record.result === "correct",
  ).length;
  const incorrect = records.filter(
    (record) => record.result === "incorrect",
  ).length;
  const neutral = records.filter(
    (record) => record.result === "neutral",
  ).length;
  const pending = records.filter(
    (record) => record.result === "pending",
  ).length;

  return {
    total,
    evaluated,
    correct,
    incorrect,
    neutral,
    pending,
    accuracyPercent:
      evaluated > 0
        ? Number(
            ((correct / evaluated) * 100).toFixed(2),
          )
        : null,
  };
}

function mapAccuracyRecord(
  row: Record<string, unknown>,
): AccuracyRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    analysisId: String(row.analysis_id),
    symbol: String(row.symbol),
    timeframe: String(row.timeframe),
    signal: String(row.signal),
    confidence:
      row.confidence === null ||
      row.confidence === undefined
        ? null
        : Number(row.confidence),
    result: row.result as SignalResult,
    entryPrice:
      row.entry_price === null ||
      row.entry_price === undefined
        ? null
        : Number(row.entry_price),
    evaluatedPrice:
      row.evaluated_price === null ||
      row.evaluated_price === undefined
        ? null
        : Number(row.evaluated_price),
    priceChangePercent:
      row.price_change_percent === null ||
      row.price_change_percent === undefined
        ? null
        : Number(row.price_change_percent),
    evaluatedAt:
      typeof row.evaluated_at === "string"
        ? row.evaluated_at
        : null,
    createdAt: String(row.created_at),
  };
}
