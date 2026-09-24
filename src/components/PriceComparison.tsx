import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Globe, Search, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import { comparePrices } from '../services/geminiService';
import { AmazonItem } from '../types';
import { generateAffiliateLink } from '../lib/affiliate';

interface PriceComparisonProps {
  affiliateId?: string;
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({ affiliateId }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AmazonItem[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleCompare = async () => {
    if (!query) return;
    setLoading(true);
    const data = await comparePrices(query);
    setResults(data);
    setLoading(false);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
    });
  }, [results, sortOrder]);

  return (
    <div className="space-y-8">
      <header className="border-b-2 border-ink pb-4">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Market_Index.v4</h2>
        <p className="text-muted text-xs font-bold font-mono">CROSS_NODE_VERIFICATION // CALCULATING_OPTIMAL_PATH...</p>
      </header>

      {/* Control Panel */}
      <div className="bg-[#F8F8F7] p-6 border border-line flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2 w-full">
          <div className="font-serif italic text-[11px] text-muted uppercase">Global Search Directive</div>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="ENTER PRODUCT NAME OR ASIN"
              className="w-full h-11 pl-12 pr-4 bg-white border border-line rounded-xs focus:border-ink outline-none font-bold text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            />
          </div>
        </div>
        <button
          onClick={handleCompare}
          disabled={loading || !query}
          className="bg-ink text-white px-10 h-11 text-xs font-black uppercase tracking-widest hover:bg-muted transition-all disabled:opacity-50 whitespace-nowrap w-full md:w-auto"
        >
          {loading ? 'CALCULATING...' : 'COMPARE_EDITIONS'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="border border-line overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_120px_100px_150px] bg-[#F0F0EE] border-b border-line font-serif italic text-[10px] text-muted p-3">
            <div className="px-4">DESIGNATION</div>
            <div>MARKET_NODE</div>
            <div onClick={toggleSort} className="cursor-pointer flex items-center gap-1 hover:text-ink">
              VALUE <ChevronDown className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </div>
            <div className="text-right">ACCESS_MATRIX</div>
          </div>

          <div className="divide-y divide-line">
            {sortedResults.map((item, idx) => (
              <div key={item.id + idx} className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_150px] items-center p-4 hover:bg-[#F9F9F9] transition-colors bg-white">
                <div className="px-4 font-bold text-xs truncate" title={item.title}>{item.title}</div>
                <div className="font-mono text-[10px] text-muted">{item.marketplace} NODE</div>
                <div className="font-mono font-bold text-sm text-ink">${item.price.toFixed(2)}</div>
                <div className="text-right">
                  <a
                    href={generateAffiliateLink(item.url, affiliateId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-accent text-white px-4 py-2 text-[10px] font-black uppercase rounded-xs hover:brightness-95 transition-all"
                  >
                    ACQUIRE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="py-20 text-center bg-[#F8F8F7] border border-dashed border-line">
          <Globe className="w-10 h-10 text-muted mx-auto mb-4 opacity-20" />
          <p className="font-mono text-xs text-muted font-bold tracking-widest uppercase">WAITING_FOR_COMMAND // NODES_IDLE</p>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[1px] z-[100] flex items-center justify-center">
          <div className="bg-ink text-white px-8 py-4 font-mono text-xs flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" /> QUERIED_NODES: {results.length}/5 ...
          </div>
        </div>
      )}
    </div>
  );
};

