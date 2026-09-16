import { createHash } from "crypto";

export type AIUsageSource =
  | "analysis"
  | "backtest"
  | "alerts"
  | "other";

export interface AICostConfig {
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  currency: string;
}

export interface AITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AICostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}

export interface AIUsageRecord {
  id: string;
  userId?: string;
  source: AIUsageSource;
  model: string;
  usage: AITokenUsage;
  cost: AICostEstimate;
  createdAt: string;
}

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini";

// Prices are configurable through environment variables so
// provider pricing can be updated without changing application code.
const DEFAULT_CONFIG: AICostConfig = {
  model: DEFAULT_MODEL,
  inputCostPer1M: Number(
    process.env.AI_INPUT_COST_PER_1M ?? "0.15",
  ),
  outputCostPer1M: Number(
    process.env.AI_OUTPUT_COST_PER_1M ?? "0.60",
  ),
  currency: "USD",
};

const MAX_TOKENS_PER_REQUEST = 200_000;
const MAX_ESTIMATED_COST = 10;

function finiteNonNegative(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

export function getAICostConfig(): AICostConfig {
  return {
    model: DEFAULT_CONFIG.model,
    inputCostPer1M: finiteNonNegative(
      DEFAULT_CONFIG.inputCostPer1M,
    ),
    outputCostPer1M: finiteNonNegative(
      DEFAULT_CONFIG.outputCostPer1M,
    ),
    currency: DEFAULT_CONFIG.currency,
  };
}

export function validateTokenUsage(
  usage: Partial<AITokenUsage>,
): AITokenUsage {
  const inputTokens = Math.floor(
    finiteNonNegative(usage.inputTokens),
  );
  const outputTokens = Math.floor(
    finiteNonNegative(usage.outputTokens),
  );

  const totalTokens = inputTokens + outputTokens;

  if (totalTokens > MAX_TOKENS_PER_REQUEST) {
    throw new Error("AI token usage exceeds the request limit.");
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function estimateAICost(
  usageInput: Partial<AITokenUsage>,
  config: AICostConfig = getAICostConfig(),
): AICostEstimate {
  const usage = validateTokenUsage(usageInput);

  const inputCost =
    (usage.inputTokens / 1_000_000) *
    finiteNonNegative(config.inputCostPer1M);

  const outputCost =
    (usage.outputTokens / 1_000_000) *
    finiteNonNegative(config.outputCostPer1M);

  const totalCost = inputCost + outputCost;

  if (totalCost > MAX_ESTIMATED_COST) {
    throw new Error("Estimated AI cost exceeds the request limit.");
  }

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: config.currency || "USD",
    model: config.model || DEFAULT_MODEL,
  };
}

export function createAIUsageRecord(input: {
  userId?: string;
  source: AIUsageSource;
  model?: string;
  usage: Partial<AITokenUsage>;
  createdAt?: string;
}): AIUsageRecord {
  const usage = validateTokenUsage(input.usage);
  const config = {
    ...getAICostConfig(),
    model: input.model || getAICostConfig().model,
  };

  const cost = estimateAICost(usage, config);

  const rawId = [
    input.userId ?? "anonymous",
    input.source,
    config.model,
    usage.totalTokens,
    input.createdAt ?? new Date().toISOString(),
  ].join(":");

  const id = createHash("sha256")
    .update(rawId)
    .digest("hex");

  return {
    id,
    userId: input.userId,
    source: input.source,
    model: config.model,
    usage,
    cost,
    createdAt:
      input.createdAt ?? new Date().toISOString(),
  };
}

export function calculateUsageCost(
  records: AIUsageRecord[],
): AICostEstimate {
  let inputCost = 0;
  let outputCost = 0;
  let totalCost = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const record of records) {
    inputTokens += record.usage.inputTokens;
    outputTokens += record.usage.outputTokens;
    inputCost += record.cost.inputCost;
    outputCost += record.cost.outputCost;
    totalCost += record.cost.totalCost;
  }

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: records[0]?.cost.currency ?? "USD",
    model: records[0]?.model ?? DEFAULT_MODEL,
  };
}

export function getAICostPerAnalysis(
  usage: Partial<AITokenUsage>,
): number {
  return estimateAICost(usage).totalCost;
}

export function shouldAllowAIRequest(
  usage: Partial<AITokenUsage>,
  dailyBudget = Number(
    process.env.AI_DAILY_BUDGET_USD ?? "25",
  ),
  currentDailyCost = 0,
): boolean {
  const requestedCost = getAICostPerAnalysis(usage);

  const budget = finiteNonNegative(dailyBudget);
  const current = finiteNonNegative(currentDailyCost);

  return (
    requestedCost <= MAX_ESTIMATED_COST &&
    current + requestedCost <= budget
  );
}

export function sanitizeAIUsageSource(
  source: unknown,
): AIUsageSource {
  if (
    source === "analysis" ||
    source === "backtest" ||
    source === "alerts"
  ) {
    return source;
  }

  return "other";
}

export function getAICostLimits() {
  return {
    maxTokensPerRequest: MAX_TOKENS_PER_REQUEST,
    maxEstimatedCostPerRequest: MAX_ESTIMATED_COST,
    dailyBudgetUsd: finiteNonNegative(
      process.env.AI_DAILY_BUDGET_USD ?? "25",
    ),
  };
}
