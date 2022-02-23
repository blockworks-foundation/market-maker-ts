import {
  normalizeBookChanges,
  normalizeTrades,
  streamNormalized,
} from 'tardis-dev';

async function listenFtxBooks() {
  if (process.send === undefined) throw new Error('process.send is undefined');
  const marketNames = process.argv[2].split(',');

  const messages = streamNormalized(
    {
      exchange: 'ftx',
      symbols: marketNames,
    },
    normalizeTrades,
    normalizeBookChanges,
  );

  for await (const msg of messages) {
    if (msg.type === 'book_change') {
      process.send({ bookUpdate:      msg,
                     nativeExchange:  'ftx',
                     nativeMarket:    msg.symbol,
                     nativeTimestamp: msg.timestamp.getTime() / 1000 });
    }
  }
}

async function listenBinanceBooks() {
  if (process.send === undefined) throw new Error('process.send is undefined');
  const binanceList = [
    'BTCUSDT',
    'ETHUSDT',
    'SOLUSDT',
    'RAYUSDT',
    'SRMUSDT',
    'BNBUSDT',
    'AVAXUSDT',
    'LUNAUSDT',
    'ADAUSDT',
  ];
  const systemMarketToNativeMarket = function(systemMarket: string) { return `${systemMarket.split('-')[0]}USDT` };
  const marketNames = process.argv[2].split(',').filter((mn) =>
    binanceList.includes(systemMarketToNativeMarket(mn)),
  );
  const nativeMarketMap = Object.fromEntries(marketNames.map((mn) => [
    systemMarketToNativeMarket(mn),
    mn
  ]));

  const messages = streamNormalized(
    {
      exchange: 'binance-futures',
      symbols: Object.keys(nativeMarketMap),
    },
    normalizeTrades,
    normalizeBookChanges,
  );

  for await (const msg of messages) {
    if (msg.type === 'book_change') {
      process.send({ bookUpdate:      msg,
                     nativeExchange:  'binance',
                     nativeMarket:    nativeMarketMap[msg.symbol],
                     nativeTimestamp: msg.timestamp.getTime() / 1000 });
    }
  }
}

listenFtxBooks();
listenBinanceBooks();
