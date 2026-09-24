import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Trash2, TrendingDown, Info, ShoppingCart, Plus, Loader2, Mail, MailWarning, Settings2, RefreshCw } from 'lucide-react';
import { db, auth, onSnapshot, collection, query, where, orderBy, deleteDoc, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { TrackedItem } from '../types';
import { generateAffiliateLink } from '../lib/affiliate';
import { PriceAnalytics } from './PriceAnalytics';

interface PriceTrackerProps {
  affiliateId?: string;
}

export const PriceTracker: React.FC<PriceTrackerProps> = ({ affiliateId }) => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [trackerTab, setTrackerTab] = useState<'items' | 'analytics'>('items');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tracked_items'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: TrackedItem[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as TrackedItem);
      });
      setItems(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tracked_items');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleEmailAlert = async (item: TrackedItem) => {
    if (!item.id) return;
    try {
      await updateDoc(doc(db, 'tracked_items', item.id), {
        emailAlertEnabled: !item.emailAlertEnabled,
        alertEmail: auth.currentUser?.email || ''
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tracked_items/${item.id}`);
    }
  };

  const triggerManualSync = async () => {
    setSyncing(true);
    // Simulate checking prices and sending alerts
    for (const item of items) {
      if (item.currentPrice <= item.targetPrice && item.emailAlertEnabled && item.id) {
        try {
          await fetch('/api/alerts/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: item.alertEmail || auth.currentUser?.email,
              itemTitle: item.title,
              targetPrice: item.targetPrice,
              currentPrice: item.currentPrice,
              url: item.url
            })
          });
          console.log(`Alert sent for ${item.title}`);
        } catch (error) {
          console.error('Failed to send email alert', error);
        }
      }
    }
    setSyncing(false);
    alert('Synchronization complete. Dispatched alerts for active price drops.');
  };

  const stopTracking = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tracked_items', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tracked_items/${id}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted" />
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="border-b-2 border-ink pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">Price_Watch.v2</h2>
          <p className="text-muted text-xs font-bold font-mono">MONITORING_ACTIVE // COMPARING_LOCAL_VS_CURRENT...</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="pill-list border border-line bg-[#F8F8F7] p-1 rounded-xs flex">
            <button
              onClick={() => setTrackerTab('items')}
              className={`pill text-[10px] font-mono uppercase px-3 py-1 font-bold ${trackerTab === 'items' ? 'active' : ''}`}
            >
              Tracked Items ({items.length})
            </button>
            <button
              onClick={() => setTrackerTab('analytics')}
              className={`pill text-[10px] font-mono uppercase px-3 py-1 font-bold flex items-center gap-1.5 ${trackerTab === 'analytics' ? 'active' : ''}`}
            >
              <TrendingDown className="w-3 h-3" />
              Price History & Savings
            </button>
          </div>
          <button 
            onClick={triggerManualSync}
            disabled={syncing}
            className="bg-bg border border-line px-4 h-9 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#F0F0EE] transition-all disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            SYNC_NODES
          </button>
        </div>
      </header>

      {trackerTab === 'analytics' ? (
        <PriceAnalytics affiliateId={affiliateId} items={items} />
      ) : (
        <>
          {items.length > 0 ? (
        <div className="border border-line overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[80px_1fr_100px_100px_100px_80px_100px] bg-[#F0F0EE] border-b border-line font-serif italic text-[10px] text-muted p-3">
            <div>ITEM</div>
            <div className="px-4">DESIGNATION</div>
            <div>TARGET</div>
            <div>CURRENT</div>
            <div>ALERTS</div>
            <div>STATUS</div>
            <div className="text-right">ACTION</div>
          </div>

          <div className="divide-y divide-line">
            {items.map((item) => {
              const priceDrop = item.currentPrice <= item.targetPrice;
              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px_100px_100px_80px_100px] items-center p-3 hover:bg-[#F9F9F9] transition-colors bg-white">
                  <div className="w-14 h-14 bg-white border border-line p-1">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="px-4">
                    <div className="font-bold text-xs truncate max-w-sm">{item.title}</div>
                    <div className="text-[10px] text-muted font-mono">{item.marketplace} NODE</div>
                  </div>
                  <div className="font-mono text-xs font-bold text-muted">${item.targetPrice}</div>
                  <div className={`font-mono text-xs font-bold ${priceDrop ? 'text-[#CC0C39] animate-pulse' : 'text-ink'}`}>
                    ${item.currentPrice || 'N/A'}
                  </div>
                  <div>
                    <button 
                      onClick={() => toggleEmailAlert(item)}
                      className={`flex items-center gap-1.5 px-2 py-1 border rounded-xs text-[9px] font-black tracking-tighter uppercase transition-colors ${item.emailAlertEnabled ? 'bg-accent/10 border-accent text-accent' : 'bg-bg border-line text-muted'}`}
                    >
                      <Mail className="w-3 h-3" />
                      {item.emailAlertEnabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-tighter">
                    {priceDrop ? (
                      <span className="text-[#CC0C39] font-black">MATCHED</span>
                    ) : (
                      <span className="text-muted">SCANNING</span>
                    )}
                  </div>
                  <div className="text-right flex justify-end gap-2">
                    <a href={generateAffiliateLink(item.url, affiliateId)} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#F0F0EE] border border-line hover:bg-line transition-colors rounded-xs">
                      <ShoppingCart className="w-3 h-3 text-ink" />
                    </a>
                    <button
                      onClick={() => item.id && stopTracking(item.id)}
                      className="bg-ink text-white px-3 py-1 text-[9px] font-black uppercase hover:bg-muted transition-colors rounded-xs"
                    >
                      STOP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center bg-[#F8F8F7] border border-dashed border-line">
          <Bell className="w-10 h-10 text-muted mx-auto mb-4 opacity-20" />
          <p className="font-mono text-xs text-muted font-bold tracking-widest uppercase">ACTIVE_ALERTS_NODE: 0000 // IDLE</p>
        </div>
      )}
        </>
      )}

      {/* Info Panel */}
      <div className="bg-ink text-white p-6 border border-line">
        <div className="flex items-start gap-4">
          <Info className="w-5 h-5 text-accent shrink-0 mt-1" />
          <div className="space-y-2">
            <h4 className="font-serif italic text-sm tracking-tight text-white/90">Automated Alerting Matrix v2.0</h4>
            <div className="text-[10px] text-white/60 leading-relaxed font-mono space-y-1">
              <p>EMAIL_PROTOCOL: RESEND_API // STATUS: ONLINE</p>
              <p>Manual SYNC_NODES command triggers cross-check of target vs current valuation and dispatches transactional alerts to verified channels.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

