import { createClient } from "@/lib/supabase/server";

export type PaperTradeSide = "buy" | "sell";
export type PaperTradeStatus =
  | "open"
  | "closed"
  | "cancelled";

export interface PaperTrade {
  id: string;
  userId: string;
  symbol: string;
  side: PaperTradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: PaperTradeStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
}

export interface CreatePaperTradeInput {
  symbol: string;
  side: PaperTradeSide;
  quantity: number;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  notes?: string | null;
}

export interface ClosePaperTradeInput {
  exitPrice: number;
}

const MAX_NOTES_LENGTH = 1000;

function validateSymbol(symbol: string) {
  const value = symbol.trim().toUpperCase();

  if (
    !value ||
    value.length > 30 ||
    !/^[A-Z0-9._/-]+$/.test(value)
  ) {
    throw new Error("Invalid symbol.");
  }

  return value;
}

function validatePositive(
  value: number,
  name: string,
) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${name} must be greater than zero.`,
    );
  }
}

function validateOptionalPrice(
  value: number | null | undefined,
  name: string,
) {
  if (value === null || value === undefined) {
    return null;
  }

  validatePositive(value, name);
  return value;
}

function validateSide(
  side: PaperTradeSide,
): PaperTradeSide {
  if (side !== "buy" && side !== "sell") {
    throw new Error("Invalid trade side.");
  }

  return side;
}

function validateTradeId(
  tradeId: string,
) {
  const id = tradeId.trim();

  if (
    !id ||
    id.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(id)
  ) {
    throw new Error("Invalid paper trade ID.");
  }

  return id;
}

function validateNotes(
  notes: string | null | undefined,
) {
  if (notes === null || notes === undefined) {
    return null;
  }

  const value = notes.trim();

  if (value.length > MAX_NOTES_LENGTH) {
    throw new Error(
      `Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`,
    );
  }

  return value || null;
}

export function validateCreatePaperTrade(
  input: CreatePaperTradeInput,
) {
  const symbol = validateSymbol(input.symbol);
  const side = validateSide(input.side);

  validatePositive(
    input.quantity,
    "Quantity",
  );

  validatePositive(
    input.entryPrice,
    "Entry price",
  );

  const stopLoss = validateOptionalPrice(
    input.stopLoss,
    "Stop loss",
  );

  const takeProfit = validateOptionalPrice(
    input.takeProfit,
    "Take profit",
  );

  if (side === "buy") {
    if (
      stopLoss !== null &&
      stopLoss >= input.entryPrice
    ) {
      throw new Error(
        "Buy stop loss must be below entry price.",
      );
    }

    if (
      takeProfit !== null &&
      takeProfit <= input.entryPrice
    ) {
      throw new Error(
        "Buy take profit must be above entry price.",
      );
    }
  }

  if (side === "sell") {
    if (
      stopLoss !== null &&
      stopLoss <= input.entryPrice
    ) {
      throw new Error(
        "Sell stop loss must be above entry price.",
      );
    }

    if (
      takeProfit !== null &&
      takeProfit >= input.entryPrice
    ) {
      throw new Error(
        "Sell take profit must be below entry price.",
      );
    }
  }

  return {
    symbol,
    side,
    quantity: input.quantity,
    entryPrice: input.entryPrice,
    stopLoss,
    takeProfit,
    notes: validateNotes(input.notes),
  };
}

export function calculatePaperTradePnl(
  trade: Pick<
    PaperTrade,
    "side" | "quantity" | "entryPrice"
  >,
  exitPrice: number,
) {
  validatePositive(
    exitPrice,
    "Exit price",
  );

  const direction =
    trade.side === "buy" ? 1 : -1;

  const pnl =
    (exitPrice - trade.entryPrice) *
    trade.quantity *
    direction;

  const entryValue =
    trade.entryPrice * trade.quantity;

  const pnlPercent =
    entryValue > 0
      ? (pnl / entryValue) * 100
      : 0;

  return {
    pnl,
    pnlPercent,
  };
}

export function evaluatePaperTradeTriggers(
  trade: Pick<
    PaperTrade,
    | "side"
    | "entryPrice"
    | "stopLoss"
    | "takeProfit"
  >,
  currentPrice: number,
): "stop_loss" | "take_profit" | null {
  validatePositive(
    currentPrice,
    "Current price",
  );

  if (trade.side === "buy") {
    if (
      trade.stopLoss !== null &&
      currentPrice <= trade.stopLoss
    ) {
      return "stop_loss";
    }

    if (
      trade.takeProfit !== null &&
      currentPrice >= trade.takeProfit
    ) {
      return "take_profit";
    }
  }

  if (trade.side === "sell") {
    if (
      trade.stopLoss !== null &&
      currentPrice >= trade.stopLoss
    ) {
      return "stop_loss";
    }

    if (
      trade.takeProfit !== null &&
      currentPrice <= trade.takeProfit
    ) {
      return "take_profit";
    }
  }

  return null;
}

export async function createPaperTrade(
  input: CreatePaperTradeInput,
): Promise<PaperTrade> {
  const validated =
    validateCreatePaperTrade(input);

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase
    .from("paper_trades")
    .insert({
      user_id: user.id,
      symbol: validated.symbol,
      side: validated.side,
      quantity: validated.quantity,
      entry_price: validated.entryPrice,
      exit_price: null,
      stop_loss: validated.stopLoss,
      take_profit: validated.takeProfit,
      pnl: null,
      pnl_percent: null,
      status: "open",
      notes: validated.notes,
    })
    .select(
      "id, user_id, symbol, side, quantity, entry_price, exit_price, stop_loss, take_profit, pnl, pnl_percent, status, opened_at, closed_at, notes",
    )
    .single();

  if (error || !data) {
    throw new Error(
      "Unable to create paper trade.",
    );
  }

  return mapPaperTrade(data);
}

export async function closePaperTrade(
  tradeId: string,
  input: ClosePaperTradeInput,
): Promise<PaperTrade> {
  const id = validateTradeId(tradeId);

  validatePositive(
    input.exitPrice,
    "Exit price",
  );

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
      .from("paper_trades")
      .select(
        "id, user_id, symbol, side, quantity, entry_price, exit_price, stop_loss, take_profit, pnl, pnl_percent, status, opened_at, closed_at, notes",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (fetchError || !existing) {
    throw new Error("Paper trade not found.");
  }

  if (existing.status !== "open") {
    throw new Error(
      "Only open paper trades can be closed.",
    );
  }

  const pnl = calculatePaperTradePnl(
    {
      side: existing.side as PaperTradeSide,
      quantity: Number(existing.quantity),
      entryPrice: Number(existing.entry_price),
    },
    input.exitPrice,
  );

  const { data, error } = await supabase
    .from("paper_trades")
    .update({
      exit_price: input.exitPrice,
      pnl: pnl.pnl,
      pnl_percent: pnl.pnlPercent,
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select(
      "id, user_id, symbol, side, quantity, entry_price, exit_price, stop_loss, take_profit, pnl, pnl_percent, status, opened_at, closed_at, notes",
    )
    .single();

  if (error || !data) {
    throw new Error(
      "Unable to close paper trade.",
    );
  }

  return mapPaperTrade(data);
}

export async function cancelPaperTrade(
  tradeId: string,
): Promise<void> {
  const id = validateTradeId(tradeId);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { error } = await supabase
    .from("paper_trades")
    .update({
      status: "cancelled",
      closed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "open");

  if (error) {
    throw new Error(
      "Unable to cancel paper trade.",
    );
  }
}

export async function getPaperTrades(
  options: {
    status?: PaperTradeStatus;
    symbol?: string;
    limit?: number;
  } = {},
): Promise<PaperTrade[]> {
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
    .from("paper_trades")
    .select(
      "id, user_id, symbol, side, quantity, entry_price, exit_price, stop_loss, take_profit, pnl, pnl_percent, status, opened_at, closed_at, notes",
    )
    .eq("user_id", user.id)
    .order("opened_at", {
      ascending: false,
    })
    .limit(limit);

  if (options.status) {
    query = query.eq(
      "status",
      options.status,
    );
  }

  if (options.symbol) {
    query = query.eq(
      "symbol",
      validateSymbol(options.symbol),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "Unable to load paper trades.",
    );
  }

  return (data ?? []).map(mapPaperTrade);
}

export function getPaperTradingSummary(
  trades: PaperTrade[],
) {
  const closed = trades.filter(
    (trade) => trade.status === "closed",
  );

  const open = trades.filter(
    (trade) => trade.status === "open",
  );

  const totalPnl = closed.reduce(
    (sum, trade) => sum + (trade.pnl ?? 0),
    0,
  );

  const wins = closed.filter(
    (trade) => (trade.pnl ?? 0) > 0,
  ).length;

  const losses = closed.filter(
    (trade) => (trade.pnl ?? 0) < 0,
  ).length;

  return {
    totalTrades: trades.length,
    openTrades: open.length,
    closedTrades: closed.length,
    winningTrades: wins,
    losingTrades: losses,
    breakevenTrades:
      closed.length - wins - losses,
    totalPnl,
    winRate:
      closed.length > 0
        ? (wins / closed.length) * 100
        : 0,
  };
}

function mapPaperTrade(
  row: Record<string, unknown>,
): PaperTrade {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    symbol: String(row.symbol),
    side: row.side as PaperTradeSide,
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    exitPrice:
      row.exit_price === null ||
      row.exit_price === undefined
        ? null
        : Number(row.exit_price),
    stopLoss:
      row.stop_loss === null ||
      row.stop_loss === undefined
        ? null
        : Number(row.stop_loss),
    takeProfit:
      row.take_profit === null ||
      row.take_profit === undefined
        ? null
        : Number(row.take_profit),
    pnl:
      row.pnl === null ||
      row.pnl === undefined
        ? null
        : Number(row.pnl),
    pnlPercent:
      row.pnl_percent === null ||
      row.pnl_percent === undefined
        ? null
        : Number(row.pnl_percent),
    status: row.status as PaperTradeStatus,
    openedAt: String(row.opened_at),
    closedAt:
      typeof row.closed_at === "string"
        ? row.closed_at
        : null,
    notes:
      typeof row.notes === "string"
        ? row.notes
        : null,
  };
}
