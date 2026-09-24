import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Share2, ExternalLink, Clock, Tag, Loader2, ArrowUpDown, ArrowDown, ArrowUp, Percent, DollarSign } from 'lucide-react';
import { db, onSnapshot, collection, query, orderBy, limit, handleFirestoreError, OperationType } from '../firebase';
import { PublicDeal } from '../types';
import { generateAffiliateLink } from '../lib/affiliate';

interface PublicDealsProps {
  affiliateId?: string;
}

type SortField = 'date' | 'discount' | 'price-asc' | 'price-desc';

interface SortOptionConfig {
  id: SortField;
  label: string;
  icon?: React.ReactNode;
}

export const PublicDeals: React.FC<PublicDealsProps> = ({ affiliateId }) => {
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('date');

  useEffect(() => {
    const q = query(
      collection(db, 'public_deals'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: PublicDeal[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as PublicDeal);
      });
      setDeals(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'public_deals');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTimestampMs = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
    if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getDiscountPercentage = (deal: PublicDeal): number => {
    if (typeof deal.discountPercentage === 'number' && !isNaN(deal.discountPercentage) && deal.discountPercentage > 0) {
      return deal.discountPercentage;
    }
    if (deal.originalPrice && deal.discountedPrice && deal.originalPrice > deal.discountedPrice) {
      return Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100);
    }
    return 0;
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'RECENT';
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      }
      if (typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? 'RECENT' : d.toLocaleDateString();
    } catch {
      return 'RECENT';
    }
  };

  const sortedDeals = useMemo(() => {
    const list = [...deals];
    switch (sortBy) {
      case 'discount':
        return list.sort((a, b) => {
          const discountDiff = getDiscountPercentage(b) - getDiscountPercentage(a);
          if (discountDiff !== 0) return discountDiff;
          return getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp);
        });
      case 'price-asc':
        return list.sort((a, b) => {
          const priceDiff = (a.discountedPrice ?? 0) - (b.discountedPrice ?? 0);
          if (priceDiff !== 0) return priceDiff;
          return getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp);
        });
      case 'price-desc':
        return list.sort((a, b) => {
          const priceDiff = (b.discountedPrice ?? 0) - (a.discountedPrice ?? 0);
          if (priceDiff !== 0) return priceDiff;
          return getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp);
        });
      case 'date':
      default:
        return list.sort((a, b) => getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp));
    }
  }, [deals, sortBy]);

  const sortOptions: SortOptionConfig[] = [
    { id: 'date', label: 'Date Posted (Newest)', icon: <Clock className="w-3 h-3" /> },
    { id: 'discount', label: 'Discount % (Highest)', icon: <Percent className="w-3 h-3" /> },
    { id: 'price-asc', label: 'Price: Low to High', icon: <DollarSign className="w-3 h-3" /> },
    { id: 'price-desc', label: 'Price: High to Low', icon: <DollarSign className="w-3 h-3" /> },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="border-b-2 border-ink pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Community_Matrix.v2</h2>
          <p className="text-muted text-xs font-bold font-mono">GLOBAL_FEED_ACCESSED // DEALS_CURATED...</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-[10px] text-muted font-bold uppercase hidden sm:block">
            ACTIVE_STREAM: <span className="text-ink font-black">{deals.length} ITEMS</span>
          </div>
          <div className="font-mono text-[10px] bg-accent text-ink px-2.5 py-1 font-black uppercase tracking-widest animate-pulse border border-ink">
            LIVE_FEED
          </div>
        </div>
      </header>

      {/* Sorting Controls matching High Density Theme */}
      <div className="bg-[#F8F8F7] p-3.5 border border-line flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-ink" />
          <span className="font-serif italic text-xs uppercase text-muted font-semibold tracking-wide">
            Sort Matrix:
          </span>
          <span className="font-mono text-[10px] text-ink font-bold uppercase bg-white border border-line px-1.5 py-0.5 ml-1">
            {sortOptions.find(o => o.id === sortBy)?.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {sortOptions.map((opt) => {
            const isActive = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={`font-mono text-[11px] px-3 py-1.5 uppercase font-bold tracking-tight transition-colors border flex items-center gap-1.5 rounded-xs cursor-pointer ${
                  isActive
                    ? 'bg-ink text-bg border-ink shadow-xs'
                    : 'bg-white text-ink border-line hover:bg-[#F0F0EE] hover:border-ink'
                }`}
                title={`Sort deals by ${opt.label}`}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {isActive && (
                  opt.id === 'price-asc' ? <ArrowUp className="w-2.5 h-2.5 ml-0.5" /> :
                  opt.id === 'price-desc' ? <ArrowDown className="w-2.5 h-2.5 ml-0.5" /> : null
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedDeals.map((deal, idx) => {
          const discount = getDiscountPercentage(deal);
          const destinationUrl = affiliateId
            ? generateAffiliateLink(deal.url || deal.affiliateUrl, affiliateId)
            : (deal.affiliateUrl || deal.url);

          return (
            <motion.div
              key={deal.id || idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-white border border-line flex h-44 overflow-hidden hover:bg-[#F9F9F9] transition-colors relative group"
            >
              {/* Product Thumbnail */}
              <div className="w-36 sm:w-40 h-full bg-[#F8F8F7] border-r border-line p-3 shrink-0 flex items-center justify-center relative">
                {deal.imageUrl ? (
                  <img
                    src={deal.imageUrl}
                    alt={deal.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[#eee] border border-line flex items-center justify-center text-muted text-[10px] font-mono">
                    NO_IMG
                  </div>
                )}
                {discount > 0 && (
                  <div className="absolute top-2 left-2 bg-[#CC0C39] text-white text-[9px] font-mono font-black px-1.5 py-0.5 rounded-xs tracking-wider shadow-xs">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-3.5 flex flex-col justify-between flex-1 min-w-0">
                <div className="space-y-1.5">
                  <h3
                    className="font-bold text-xs line-clamp-2 leading-tight uppercase tracking-tight text-ink"
                    title={deal.title}
                  >
                    {deal.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono text-muted uppercase">
                    <span className="flex items-center gap-1 font-bold">
                      <Clock className="w-2.5 h-2.5" /> {formatDate(deal.timestamp)}
                    </span>
                    <span className="flex items-center gap-1 bg-bg border border-line px-1 rounded-xs font-semibold text-ink">
                      <Tag className="w-2.5 h-2.5" /> {deal.marketplace || 'US'}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-line/50">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-lg font-black text-[#CC0C39]">
                        ${deal.discountedPrice}
                      </span>
                      {deal.originalPrice && deal.originalPrice > deal.discountedPrice && (
                        <span className="font-mono text-[10px] text-muted line-through">
                          ${deal.originalPrice}
                        </span>
                      )}
                    </div>
                    {discount > 0 && (
                      <div className="text-[10px] font-mono font-bold text-muted">
                        SAVINGS: <span className="text-[#CC0C39]">${(deal.originalPrice ? (deal.originalPrice - deal.discountedPrice).toFixed(2) : '0.00')}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-accent text-ink border border-ink px-3.5 h-8 text-[10px] font-black uppercase flex items-center gap-1 hover:brightness-95 transition-all shadow-xs rounded-xs tracking-wider"
                  >
                    ACQUIRE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sortedDeals.length === 0 && (
        <div className="py-20 text-center bg-[#F8F8F7] border border-dashed border-line">
          <Share2 className="w-10 h-10 text-muted mx-auto mb-4 opacity-20" />
          <p className="font-mono text-xs text-muted font-bold tracking-widest uppercase">
            FEED_EMPTY // NO_ACTIVELY_SHARED_DEALS
          </p>
        </div>
      )}
    </div>
  );
};
