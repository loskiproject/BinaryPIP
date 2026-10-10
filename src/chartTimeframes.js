export const TIMEFRAME_TO_MS = Object.freeze({
  '1s': 1000,
  '5s': 5000,
  '1m': 60000,
  '5m': 300000,
  '15m': 900000,
  '1h': 3600000,
  '1d': 86400000,
})

export const getTimeframeVolatility = (timeframe) => {
  const scaleMap = {
    '1s': 0.6,
    '5s': 0.9,
    '1m': 1.2,
    '5m': 1.9,
    '15m': 2.6,
    '1h': 3.5,
    '1d': 4.8,
  }

  return scaleMap[timeframe] ?? scaleMap['1m']
}
