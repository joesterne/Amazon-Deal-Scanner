import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Share2, ExternalLink, Clock, Tag, Loader2 } from 'lucide-react';
import { db, onSnapshot, collection, query, orderBy, limit, handleFirestoreError, OperationType } from '../firebase';
import { PublicDeal } from '../types';

export const PublicDeals: React.FC = () => {
  const [deals, setDeals] = useState<PublicDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'public_deals'),
      orderBy('timestamp', 'desc'),
      limit(50)
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted" />
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="border-b-2 border-ink pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Community_Matrix.v2</h2>
          <p className="text-muted text-xs font-bold font-mono">GLOBAL_FEED_ACCESSED // DEALS_CURATED...</p>
        </div>
        <div className="font-mono text-[10px] bg-accent text-white px-2 py-0.5 font-bold uppercase tracking-widest animate-pulse">
          LIVE_STREAM
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deals.map((deal, idx) => (
          <motion.div
            key={deal.id || idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white border border-line flex h-40 overflow-hidden hover:bg-[#F9F9F9] transition-colors"
          >
            <div className="w-40 h-full bg-[#F8F8F7] border-r border-line p-3 shrink-0">
              <img
                src={deal.imageUrl}
                alt=""
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
              <div className="space-y-1">
                <h3 className="font-bold text-xs line-clamp-2 leading-tight uppercase tracking-tight">{deal.title}</h3>
                <div className="flex items-center gap-3 text-[9px] font-mono text-muted uppercase">
                  <span className="flex items-center gap-1 font-bold"><Clock className="w-2 h-2" /> {new Date(deal.timestamp?.toDate()).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 bg-bg px-1 rounded-xs"><Tag className="w-2 h-2" /> {deal.marketplace}</span>
                </div>
              </div>

              <div className="flex items-end justify-between mt-2">
                <div>
                   <div className="font-mono text-lg font-black text-[#CC0C39]">${deal.discountedPrice}</div>
                   <div className="font-mono text-[10px] text-muted line-through">${deal.originalPrice}</div>
                </div>
                <a
                  href={deal.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent text-white px-4 h-8 text-[10px] font-black uppercase flex items-center gap-1 hover:brightness-95 transition-all shadow-sm rounded-xs"
                >
                  ACQUIRE <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {deals.length === 0 && (
        <div className="py-20 text-center bg-[#F8F8F7] border border-dashed border-line">
          <Share2 className="w-10 h-10 text-muted mx-auto mb-4 opacity-20" />
          <p className="font-mono text-xs text-muted font-bold tracking-widest uppercase">FEED_EMPTY // NO_ACTIVELY_SHARED_DEALS</p>
        </div>
      )}
    </div>
  );
};
