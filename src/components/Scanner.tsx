import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Loader2, Tag, ExternalLink, Share2, Plus, Globe } from 'lucide-react';
import { scanAmazonDeals } from '../services/geminiService';
import { AmazonItem, PublicDeal, TrackedItem } from '../types';
import { db, auth, handleFirestoreError, OperationType, setDoc, doc, Timestamp, collection, addDoc } from '../firebase';
import { generateAffiliateLink } from '../lib/affiliate';

interface ScannerProps {
  affiliateId?: string;
}

export const Scanner: React.FC<ScannerProps> = ({ affiliateId }) => {
  const [query, setQuery] = useState('');
  const [minDiscount, setMinDiscount] = useState(20);
  const [marketplace, setMarketplace] = useState('US');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AmazonItem[]>([]);

  const handleScan = async () => {
    setLoading(true);
    const results = await scanAmazonDeals(query, minDiscount, marketplace);
    setItems(results);
    setLoading(false);
  };

  const addToPublicDeals = async (item: AmazonItem) => {
    if (!auth.currentUser) return alert('Please sign in to share deals.');
    
    const deal: PublicDeal = {
      finderUserId: auth.currentUser.uid,
      title: item.title,
      originalPrice: item.originalPrice || item.price * 1.25,
      discountedPrice: item.price,
      discountPercentage: item.discountPercentage || 20,
      marketplace: item.marketplace,
      url: item.url,
      affiliateUrl: generateAffiliateLink(item.url, affiliateId),
      imageUrl: item.imageUrl,
      timestamp: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'public_deals'), deal);
      alert('Deal shared successfully!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'public_deals');
    }
  };

  const trackPrice = async (item: AmazonItem) => {
    if (!auth.currentUser) return alert('Please sign in to track prices.');
    
    const tracked: TrackedItem = {
      userId: auth.currentUser.uid,
      amazonId: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      targetPrice: item.price * 0.9, // Default target is 10% lower
      currentPrice: item.price,
      marketplace: item.marketplace,
      url: item.url,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'tracked_items'), tracked);
      alert('Started tracking item price!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'tracked_items');
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b-2 border-ink pb-4">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Deal_Scanner.v2</h2>
        <p className="text-muted text-xs font-bold font-mono">INTELLIGENCE_FILTER_ACTIVE // QUERYING_DATA_NODES...</p>
      </header>

      {/* Control Panel */}
      <div className="bg-[#F8F8F7] p-6 border border-line space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2 col-span-1 md:col-span-2">
            <div className="font-serif italic text-[11px] text-muted uppercase">Query String</div>
            <input
              type="text"
              placeholder="ASIN, KEYWORD, OR URL"
              className="w-full h-10 px-4 bg-white border border-line rounded-xs focus:border-ink outline-none font-mono text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
          </div>
          <div className="space-y-2">
            <div className="font-serif italic text-[11px] text-muted uppercase">Min Offset (%)</div>
            <input
              type="number"
              className="w-full h-10 px-4 bg-white border border-line rounded-xs focus:border-ink outline-none font-mono text-xs"
              value={minDiscount}
              onChange={(e) => setMinDiscount(parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <div className="font-serif italic text-[11px] text-muted uppercase">Marketplace</div>
            <select
              className="w-full h-10 px-4 bg-white border border-line rounded-xs focus:border-ink outline-none font-bold text-xs uppercase"
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
            >
              {['US', 'UK', 'CA', 'DE', 'FR'].map(m => <option key={m} value={m}>{m} NODE</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleScan}
            disabled={loading}
            className="bg-ink text-white px-10 h-11 text-xs font-black uppercase tracking-widest hover:bg-muted transition-all disabled:opacity-50"
          >
            {loading ? 'EXECUTING...' : 'RUN_SCAN'}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="border border-line overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[80px_1.5fr_100px_100px_80px_120px_100px] bg-[#F0F0EE] border-b border-line font-serif italic text-[10px] text-muted p-3">
          <div>ASSET</div>
          <div className="px-4">DESIGNATION</div>
          <div>CURR_VAL</div>
          <div>PREV_VAL</div>
          <div>DIFF</div>
          <div>ACTION_MATRIX</div>
          <div className="text-right">NODE</div>
        </div>

        {items.length > 0 ? (
          <div className="divide-y divide-line">
            {items.map((item, idx) => (
              <div
                key={item.id + idx}
                className="grid grid-cols-1 md:grid-cols-[80px_1.5fr_100px_100px_80px_120px_100px] items-center p-3 hover:bg-[#F9F9F9] transition-colors"
              >
                <div className="w-14 h-14 bg-white border border-line p-1">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="px-4 font-bold text-xs truncate" title={item.title}>{item.title}</div>
                <div className="font-mono font-bold text-xs text-ink">${item.price}</div>
                <div className="font-mono text-[10px] text-muted line-through">${item.originalPrice || (item.price * 1.25).toFixed(2)}</div>
                <div className="text-[#CC0C39] font-black text-xs">-{item.discountPercentage || 25}%</div>
                <div className="flex gap-1">
                  <button onClick={() => trackPrice(item)} className="p-1.5 bg-[#F0F0EE] border border-line hover:bg-line transition-colors" title="Track">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => addToPublicDeals(item)} className="p-1.5 bg-[#F0F0EE] border border-line hover:bg-line transition-colors" title="Share">
                    <Share2 className="w-3 h-3" />
                  </button>
                  <a
                    href={generateAffiliateLink(item.url, affiliateId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-accent text-white h-7 px-3 text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:brightness-95"
                  >
                    LINK <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <div className="text-right font-mono text-[10px] text-muted">{item.marketplace}</div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="py-20 text-center bg-white">
            <p className="font-mono text-xs text-muted">IDLE_STATE // NO_RECORDS_FOUND</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[1px] z-[100] flex items-center justify-center">
          <div className="bg-ink text-white px-8 py-4 font-mono text-xs flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" /> EXECUTING_SCAN_OPERATION...
          </div>
        </div>
      )}
    </div>
  );

};
