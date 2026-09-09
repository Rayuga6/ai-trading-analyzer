import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tickerResponse = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      {
        cache: "no-store",
      }
    );

    const candleResponse = await fetch(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=100",
      {
        cache: "no-store",
      }
    );

    if (!tickerResponse.ok || !candleResponse.ok) {
      throw new Error("Failed to fetch Binance market data");
    }

    const ticker = await tickerResponse.json();
    const candles = await candleResponse.json();

    const highs = candles.map((candle: any[]) => Number(candle[2]));
    const lows = candles.map((candle: any[]) => Number(candle[3]));
    const volumes = candles.map((candle: any[]) => Number(candle[5]));
        // Market Structure
    const structureCandles = candles.slice(-30);

    const structureHighs = structureCandles.map(
      (candle: any[]) => Number(candle[2])
    );

    const structureLows = structureCandles.map(
      (candle: any[]) => Number(candle[3])
    );

    const structureCloses = structureCandles.map(
      (candle: any[]) => Number(candle[4])
    );

    const recentHigh = Math.max(...structureHighs);
    const previousHigh = Math.max(
      ...structureHighs.slice(0, -5)
    );

    const recentLow = Math.min(...structureLows);
    const previousLow = Math.min(
      ...structureLows.slice(0, -5)
    );

    let marketStructure = "Consolidation";

    if (
      recentHigh > previousHigh &&
      recentLow > previousLow
    ) {
      marketStructure = "Higher High / Higher Low";
    } else if (
      recentHigh < previousHigh &&
      recentLow < previousLow
    ) {
      marketStructure = "Lower High / Lower Low";
    } else if (recentHigh > previousHigh) {
      marketStructure = "Bullish Breakout";
    } else if (recentLow < previousLow) {
      marketStructure = "Bearish Breakdown";
    }

    const lastClose =
      structureCloses[structureCloses.length - 1];

    const structureRange =
      recentHigh - recentLow;

    const rangePercent =
      lastClose !== 0
        ? (structureRange / lastClose) * 100
        : 0;

    const isConsolidating = rangePercent < 1.5;
       
    // Support & Resistance
    const recentCandles = candles.slice(-50);

    const recentHighs = recentCandles.map(
      (candle: any[]) => Number(candle[2])
    );

    const recentLows = recentCandles.map(
      (candle: any[]) => Number(candle[3])
    );

    const currentMarketPrice = Number(ticker.price);

    const resistanceLevels = recentHighs
      .filter((level: number) => level > currentMarketPrice)
      .sort((a: number, b: number) => a - b);

    const supportLevels = recentLows
      .filter((level: number) => level < currentMarketPrice)
      .sort((a: number, b: number) => b - a);

    const resistance = [
      resistanceLevels[0] ?? null,
      resistanceLevels[1] ?? null,
      resistanceLevels[2] ?? null,
    ];

    const support = [
      supportLevels[0] ?? null,
      supportLevels[1] ?? null,
      supportLevels[2] ?? null,
    ];

    const period = 14;

    // Calculate True Range
    const trueRanges = candles.map((candle: any[], index: number) => {
      const high = Number(candle[2]);
      const low = Number(candle[3]);

      if (index === 0) {
        return high - low;
      }

      const previousClose = Number(candles[index - 1][4]);

      return Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose)
      );
    });

    // Calculate ATR
    const atrSlice = trueRanges.slice(-period);

    const atr =
      atrSlice.reduce((sum: number, value: number) => sum + value, 0) /
      atrSlice.length;

    // Calculate Directional Movement
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Calculate ADX
    const dxValues: number[] = [];

    for (let i = period - 1; i < plusDM.length; i++) {
      const plusDMSlice = plusDM.slice(i - period + 1, i + 1);
      const minusDMSlice = minusDM.slice(i - period + 1, i + 1);
      const trSlice = trueRanges.slice(i + 1 - period, i + 1);

      const plusDMSum = plusDMSlice.reduce(
        (sum: number, value:number) => sum + value,
        0
      );

      const minusDMSum = minusDMSlice.reduce(
        (sum: number, value: number) => sum + value,
        0
      );

      const trSum = trSlice.reduce(
        (sum: number, value: number) => sum + value, 
        0
      );

      if (trSum === 0) {
        continue;
      }

      const plusDI = (plusDMSum / trSum) * 100;
      const minusDI = (minusDMSum / trSum) * 100;

      const diSum = plusDI + minusDI;

      if (diSum === 0) {
        continue;
      }

      const dx =
        (Math.abs(plusDI - minusDI) / diSum) * 100;

      dxValues.push(dx);
    }

    const recentDX = dxValues.slice(-period);

    const adx =
      recentDX.length > 0
        ? recentDX.reduce(
          (sum: number, value: number) => sum + value,
           0
          ) / recentDX.length
        : null;

    // Calculate Volume
    const recentVolumes = volumes.slice(-20);

    const averageVolume =
      recentVolumes.reduce(
        (sum: number, value: number) => sum + value,
        0
      ) / recentVolumes.length;

    const currentVolume = volumes[volumes.length - 1];

    const volumeRatio = currentVolume / averageVolume;

    return NextResponse.json({
      symbol: ticker.symbol,
      price: Number(ticker.price),

      timeframe: "15m",

      adx: adx !== null ? Number(adx.toFixed(2)) : null,

      atr: Number(atr.toFixed(2)),

      currentVolume: Number(currentVolume.toFixed(2)),

      averageVolume: Number(averageVolume.toFixed(2)),

      volumeRatio: Number(volumeRatio.toFixed(2)),
      support: support.map((level: number | null) =>
        level !== null ? Number(level.toFixed(2)) : null
     ),

      resistance: resistance.map((level: number | null) =>
        level !== null ? Number(level.toFixed(2)) : null
     ),
       marketStructure,
recentHigh: Number(recentHigh.toFixed(2)),
previousHigh: Number(previousHigh.toFixed(2)),
recentLow: Number(recentLow.toFixed(2)),
previousLow: Number(previousLow.toFixed(2)),
lastClose: Number(lastClose.toFixed(2)),
isConsolidating,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Market API error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch market data",
      },
      {
        status: 500,
      }
    );
  }
}