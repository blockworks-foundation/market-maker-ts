import fs from 'fs';
import path from 'path';
import {
  normalizeBookChanges,
  normalizeTrades,
  streamNormalized,
  OrderBook,
} from 'tardis-dev';

class TardisBook extends OrderBook {
  getQuoteSizedBestBid(quoteSize: number): number | undefined {
    let rem = quoteSize;
    for (const bid of this.bids()) {
      rem -= bid.amount * bid.price;
      if (rem <= 0) {
        return bid.price;
      }
    }
    return undefined;
  }
  getQuoteSizedBestAsk(quoteSize: number): number | undefined {
    let rem = quoteSize;
    for (const ask of this.asks()) {
      rem -= ask.amount * ask.price;
      if (rem <= 0) {
        return ask.price;
      }
    }
    return undefined;
  }
  getMid(): number | undefined {
    const b = this.bestBid();
    const a = this.bestAsk();
    return a && b ? (a.price + b.price) / 2 : undefined;
  }
}

type MultiBook = {
  marketName: string;
  ftxMid: number | undefined;
  books: {
    ftx: { book: TardisBook; updateTime: number; };
    binance: { book: TardisBook, updateTime: number; };
  };
};

type EquityMessage = {
  equity: number;
};

const paramsFileName = process.env.PARAMS || 'default.json';
const params = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, `../params/${paramsFileName}`),
    'utf-8',
  ),
);

function listMin(list: (number | undefined)[]): number | undefined {
  list = list.filter((e) => e !== undefined);
  if (list.length === 0) return undefined;
  // @ts-ignore
  return Math.min(...list);
}

function listMax(list: (number | undefined)[]): number | undefined {
  list = list.filter((e) => e !== undefined);
  if (list.length === 0) return undefined;
  // @ts-ignore
  return Math.max(...list);
}

let equity: number = 0;
process.on('message', (m: EquityMessage) => {
  equity = m.equity;
});

async function listenFtxBooks(books: MultiBook[]) {
  if (process.send === undefined) throw new Error('process.send is undefined');
  const marketNames = books.map((book) => book.marketName);
  const marketNameToBook = Object.fromEntries(
    books.map((book) => [book.marketName, book]),
  );

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
      const marketName = msg.symbol;
      const mb = marketNameToBook[marketName];
      mb.books.ftx.book.update(msg);
      mb.ftxMid = mb.books.ftx.book.getMid();
      mb.books.ftx.updateTime = msg.timestamp.getTime() / 1000;

      const assetParams = params.assets[marketName.split('-')[0]].perp;
      const ftxSize = assetParams.ftxSize;
      const sizePerc = assetParams.sizePerc;
      const quoteSize = equity * sizePerc;
      const aggBid = listMin(
        Object.values(marketNameToBook[marketName].books).map(({ book, updateTime }) =>
          book.getQuoteSizedBestBid(ftxSize || quoteSize),
        ),
      );
      const aggAsk = listMax(
        Object.values(marketNameToBook[marketName].books).map(({ book, updateTime }) =>
          book.getQuoteSizedBestAsk(ftxSize || quoteSize),
        ),
      );
      process.send({ marketName: marketName,
                     aggBid:     aggBid,
                     aggAsk:     aggAsk,
                     ftxMid:     mb.ftxMid });
    }
  }

  process.on('message', (m: EquityMessage) => {
    equity = m.equity;
  });
}

async function listenBinanceBooks(books: MultiBook[]) {
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
  const marketNames = books.map((book) => book.marketName).filter((mn) =>
    binanceList.includes(systemMarketToNativeMarket(mn)),
  );
  const marketNameToBook = Object.fromEntries(
    books.map((book) => [book.marketName, book]),
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
      const marketName = nativeMarketMap[msg.symbol];
      const mb = marketNameToBook[marketName];
      mb.books.binance.book.update(msg);
      mb.books.binance.updateTime = msg.timestamp.getTime() / 1000;

      const assetParams = params.assets[marketName.split('-')[0]].perp;
      const ftxSize = assetParams.ftxSize;
      const sizePerc = assetParams.sizePerc;
      const quoteSize = equity * sizePerc;
      const aggBid = listMin(
        Object.values(marketNameToBook[marketName].books).map(({ book, updateTime }) =>
          book.getQuoteSizedBestBid(ftxSize || quoteSize),
        ),
      );
      const aggAsk = listMax(
        Object.values(marketNameToBook[marketName].books).map(({ book, updateTime }) =>
          book.getQuoteSizedBestAsk(ftxSize || quoteSize),
        ),
      );
      process.send({ marketName: marketName,
                     aggBid:     aggBid,
                     aggAsk:     aggAsk,
                     ftxMid:     mb.ftxMid });
    }
  }
}

const marketNames = process.argv[2].split(',');
const books: MultiBook[] = marketNames.map((mn) => {
    return {
      marketName: mn,
      ftxMid: 0,
      books: {
        ftx: { book: new TardisBook(), updateTime: 0 },
        binance: { book: new TardisBook(), updateTime: 0 },
      },
    };
});

listenFtxBooks(books);
listenBinanceBooks(books);
