export const TIMEFRAME_TO_MS: Record<'1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '1d', number>

export function getTimeframeVolatility(timeframe: '1s' | '5s' | '1m' | '5m' | '15m' | '1h' | '1d'): number
