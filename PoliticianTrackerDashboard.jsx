import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, RefreshCw, AlertCircle } from 'lucide-react';

// Heat map color generator based on portfolio %
const getHeatmapColor = (percent) => {
  const p = Math.min(Math.max(parseFloat(percent), 0), 15);
  const ratio = p / 15;
  
  // Yellow (low) → Orange → Red (high)
  if (ratio < 0.33) {
    return `rgba(250, 204, 21, ${0.3 + ratio})`; // Yellow
  } else if (ratio < 0.66) {
    return `rgba(251, 146, 60, ${0.4 + ratio * 0.3})`; // Orange
  } else {
    return `rgba(239, 68, 68, ${0.5 + ratio * 0.2})`; // Red
  }
};

const getBgColor = (percent) => {
  const p = parseFloat(percent);
  if (p < 1) return 'bg-yellow-50 border-yellow-200';
  if (p < 3) return 'bg-orange-50 border-orange-200';
  if (p < 5) return 'bg-orange-100 border-orange-300';
  return 'bg-red-100 border-red-300';
};

export default function PoliticianTradesTracker() {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoliticians, setSelectedPoliticians] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState('recent'); // 'recent' or 'performance'

  // Load trades data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('./trades-data.json');
        const data = await response.json();
        setTrades(data.trades || []);
        setLastUpdated(data.lastUpdated);
        
        // Initialize all politicians as selected
        const politicians = new Set(data.trades.map((t) => t.politician));
        setSelectedPoliticians(politicians);
        
        setLoading(false);
      } catch (e) {
        console.error('Failed to load trades:', e);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter trades based on search and selection
  useEffect(() => {
    let filtered = trades;

    // Filter by politician selection
    if (selectedPoliticians.size > 0) {
      filtered = filtered.filter((t) => selectedPoliticians.has(t.politician));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.politician.toLowerCase().includes(term) ||
          t.ticker.toLowerCase().includes(term)
      );
    }

    setFilteredTrades(filtered);
  }, [trades, searchTerm, selectedPoliticians]);

  // Get unique politicians
  const uniquePoliticians = Array.from(new Set(trades.map((t) => t.politician))).sort();

  // Toggle politician selection
  const togglePolitician = (name) => {
    const newSelected = new Set(selectedPoliticians);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedPoliticians(newSelected);
  };

  // Calculate performance stats
  const calculatePerformance = () => {
    const stats = {};
    filteredTrades.forEach((trade) => {
      if (!stats[trade.politician]) {
        stats[trade.politician] = { buys: 0, sells: 0, totalWeight: 0 };
      }
      stats[trade.politician].totalWeight += parseFloat(trade.portfolioPercent);
      if (trade.type === 'BUY') stats[trade.politician].buys++;
      else stats[trade.politician].sells++;
    });
    return stats;
  };

  const performanceStats = calculatePerformance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Capitol Trades
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time political trading tracker</p>
            </div>
            <div className="text-right">
              {lastUpdated && (
                <p className="text-xs text-slate-500">
                  Last synced: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-2 p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search politician or ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="text-slate-400 mt-4">Loading trades data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar: Politicians */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-cyan-400" />
                  Watch List
                </h2>
                <div className="space-y-3">
                  {uniquePoliticians.map((politician) => (
                    <label
                      key={politician}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPoliticians.has(politician)}
                        onChange={() => togglePolitician(politician)}
                        className="w-4 h-4 rounded accent-blue-500"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                        {politician}
                      </span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {trades.filter((t) => t.politician === politician).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="mt-6 bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('recent')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'recent'
                        ? 'bg-blue-600 text-slate-50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => setViewMode('performance')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'performance'
                        ? 'bg-blue-600 text-slate-50'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    Stats
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {viewMode === 'recent' ? (
                // Recent Trades Table
                <div className="space-y-3">
                  {filteredTrades.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                      <p className="text-slate-400">No trades found</p>
                    </div>
                  ) : (
                    filteredTrades.map((trade, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-xl p-5 transition-all hover:border-slate-500 ${getBgColor(
                          trade.portfolioPercent
                        )}`}
                        style={{
                          background: `linear-gradient(to right, ${getHeatmapColor(
                            trade.portfolioPercent
                          )}, rgba(15, 23, 42, 0.3))`,
                          borderColor: 'rgba(100, 116, 139, 0.5)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-semibold text-slate-100">{trade.politician}</p>
                              <p className="text-xs text-slate-500">{trade.state}</p>
                            </div>
                            <div className="text-2xl font-bold text-slate-100">{trade.ticker}</div>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
                              trade.type === 'BUY'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {trade.type === 'BUY' ? (
                                <TrendingUp size={16} />
                              ) : (
                                <TrendingDown size={16} />
                              )}
                              {trade.type}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-100">
                              {trade.portfolioPercent}%
                            </p>
                            <p className="text-xs text-slate-500">of portfolio</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-slate-500 text-xs">Amount</p>
                            <p className="text-slate-100 font-mono">{trade.amount}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Price</p>
                            <p className="text-slate-100 font-mono">
                              {trade.currentPrice ? `$${trade.currentPrice.toFixed(2)}` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Trade Date</p>
                            <p className="text-slate-100 font-mono">{trade.tradeDate}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Filed</p>
                            <p className="text-slate-100 font-mono">{trade.filingDate}</p>
                          </div>
                        </div>

                        <a
                          href={trade.secLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          View SEC Filing →
                        </a>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Performance Stats
                <div className="space-y-3">
                  {Object.entries(performanceStats).length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                      <p className="text-slate-400">No data for selected politicians</p>
                    </div>
                  ) : (
                    Object.entries(performanceStats)
                      .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
                      .map(([politician, stats]) => (
                        <div
                          key={politician}
                          className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-all"
                        >
                          <p className="font-semibold text-slate-100 mb-3">{politician}</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Buys</p>
                              <p className="text-2xl font-bold text-green-400">{stats.buys}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Sells</p>
                              <p className="text-2xl font-bold text-red-400">{stats.sells}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">Total Weight</p>
                              <p className="text-2xl font-bold text-cyan-400">
                                {stats.totalWeight.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-900/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">
          <p>Data sourced from Politician Trade Tracker API. Updated nightly via GitHub Actions.</p>
        </div>
      </div>
    </div>
  );
}
