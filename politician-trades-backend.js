#!/usr/bin/env node

/**
 * Politician Trades Tracker - Backend
 * Fetches trades from Politician Trade Tracker API
 * Calculates portfolio %, sends Discord alerts, updates JSON data file
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  API_KEY: process.env.PTT_API_KEY || 'demo', // Get from https://www.politiciantradetracker.us
  DISCORD_WEBHOOK: process.env.DISCORD_WEBHOOK || '', // Your Discord webhook URL
  DATA_FILE: path.join(__dirname, 'trades-data.json'),
  FINNHUB_KEY: process.env.FINNHUB_KEY || '', // Free key from https://finnhub.io
  DAYS_TO_TRACK: 45,
};

// Politicians to track (customize these)
const WATCHED_POLITICIANS = [
  'Nancy Pelosi',
  'Mitch McConnell',
  'Alexandria Ocasio-Cortez',
  'Mitt Romney',
  'Chuck Schumer',
  'Kevin McCarthy',
  'Maxine Waters',
  'Jim Jordan',
  'AOC', // Alternative name
  'Johnny Olszewski', // Mike's local rep
];

// Utility: Fetch from API
function fetchAPI(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (politician-trades-tracker)',
      ...headers,
    };

    https.get(url, { headers: defaultHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

// Get current stock price from Finnhub
async function getStockPrice(ticker) {
  if (!CONFIG.FINNHUB_KEY) return null;
  try {
    const data = await fetchAPI(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${CONFIG.FINNHUB_KEY}`
    );
    return data.c || null;
  } catch (e) {
    console.warn(`Failed to fetch price for ${ticker}:`, e.message);
    return null;
  }
}

// Fetch trades from Politician Trade Tracker API
async function fetchPoliticianTrades() {
  console.log('Fetching politician trades...');
  
  try {
    // This is a placeholder - you'll need to adjust based on actual PTT API
    // The API endpoint structure depends on their documentation
    const data = await fetchAPI(
      `https://api.politiciantradetracker.us/trades?days=${CONFIG.DAYS_TO_TRACK}&limit=500`,
      { 'Authorization': `Bearer ${CONFIG.API_KEY}` }
    );
    return data.trades || data || [];
  } catch (e) {
    console.error('Failed to fetch trades:', e.message);
    return [];
  }
}

// Parse trade amount to number
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const match = amountStr.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : 0;
}

// Calculate portfolio percentage (rough estimate)
function calculatePortfolioPercent(tradeAmount, politicianEstimatedNetWorth = 5000000) {
  // Simple heuristic: assume politician's net worth as baseline
  // This is imprecise but gives relative weight
  return ((tradeAmount / politicianEstimatedNetWorth) * 100).toFixed(2);
}

// Filter watched politicians
function isWatchedPolitician(name) {
  return WATCHED_POLITICIANS.some((watched) =>
    name.toLowerCase().includes(watched.toLowerCase()) ||
    watched.toLowerCase().includes(name.toLowerCase())
  );
}

// Send Discord notification
async function sendDiscordAlert(trade) {
  if (!CONFIG.DISCORD_WEBHOOK) {
    console.log('Discord webhook not configured, skipping notification');
    return;
  }

  const embed = {
    title: `📈 ${trade.politician} - ${trade.type}`,
    description: `${trade.ticker} · ${trade.amount}`,
    fields: [
      { name: 'Portfolio Weight', value: `${trade.portfolioPercent}%`, inline: true },
      { name: 'Trade Date', value: trade.tradeDate, inline: true },
      { name: 'Filed', value: trade.filingDate, inline: true },
    ],
    color: trade.type === 'BUY' ? 3066993 : 15158332, // Green for buy, red for sell
    timestamp: new Date().toISOString(),
  };

  const payload = { embeds: [embed] };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(CONFIG.DISCORD_WEBHOOK);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 204) resolve();
      else reject(new Error(`Discord returned ${res.statusCode}`));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Load existing trades
function loadTradesData() {
  if (fs.existsSync(CONFIG.DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.DATA_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Failed to parse existing data, starting fresh');
      return { trades: [], lastUpdated: null };
    }
  }
  return { trades: [], lastUpdated: null };
}

// Save trades to JSON
function saveTradesData(data) {
  fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.trades.length} trades to ${CONFIG.DATA_FILE}`);
}

// Filter old trades (keep only last 45 days)
function filterRecentTrades(trades) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - CONFIG.DAYS_TO_TRACK * 24 * 60 * 60 * 1000);

  return trades.filter((trade) => {
    const tradeDate = new Date(trade.tradeDate);
    return tradeDate >= cutoff;
  });
}

// Main execution
async function main() {
  console.log('🚀 Starting politician trades sync...');
  console.log(`Watching: ${WATCHED_POLITICIANS.join(', ')}`);

  const existingData = loadTradesData();
  const existingTradeIds = new Set(existingData.trades.map((t) => `${t.politician}:${t.ticker}:${t.tradeDate}`));

  // Fetch new trades
  let allTrades = await fetchPoliticianTrades();
  console.log(`Fetched ${allTrades.length} total trades from API`);

  // Filter to watched politicians
  allTrades = allTrades.filter((trade) => isWatchedPolitician(trade.politician || trade.name));
  console.log(`Filtered to ${allTrades.length} watched politician trades`);

  // Enrich with prices and portfolio %
  const enrichedTrades = [];
  for (const trade of allTrades) {
    const price = await getStockPrice(trade.ticker);
    const amount = parseAmount(trade.amount);
    const portfolioPercent = calculatePortfolioPercent(amount);

    const enriched = {
      politician: trade.politician || trade.name,
      state: trade.state || '',
      ticker: trade.ticker.toUpperCase(),
      type: (trade.type || 'UNKNOWN').toUpperCase(),
      amount: trade.amount,
      tradeDate: trade.tradeDate || trade.date,
      filingDate: trade.filingDate || new Date().toISOString().split('T')[0],
      portfolioPercent: parseFloat(portfolioPercent),
      currentPrice: price,
      secLink: trade.filing_url || `https://disclosures-clerk.house.gov/FinancialDisclosure`,
    };

    enrichedTrades.push(enriched);

    // Check if new trade
    const tradeId = `${enriched.politician}:${enriched.ticker}:${enriched.tradeDate}`;
    if (!existingTradeIds.has(tradeId)) {
      console.log(`📢 NEW TRADE: ${enriched.politician} ${enriched.type} ${enriched.ticker}`);
      await sendDiscordAlert(enriched);
      await new Promise((r) => setTimeout(r, 500)); // Rate limit Discord
    }
  }

  // Combine with existing, remove duplicates, filter old
  const allCombined = [...enrichedTrades, ...existingData.trades];
  const uniqueTrades = Array.from(
    new Map(allCombined.map((t) => [`${t.politician}:${t.ticker}:${t.tradeDate}`, t])).values()
  );
  const recentTrades = filterRecentTrades(uniqueTrades).sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));

  // Save
  const output = {
    trades: recentTrades,
    lastUpdated: new Date().toISOString(),
    policyCount: WATCHED_POLITICIANS.length,
  };

  saveTradesData(output);
  console.log(`✅ Complete! Synced at ${new Date().toLocaleString()}`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
