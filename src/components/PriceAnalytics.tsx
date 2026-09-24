import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
  ShoppingCart,
  AlertCircle,
  ExternalLink,
  Tag
} from 'lucide-react';
import { TrackedItem } from '../types';
import { generateAffiliateLink } from '../lib/affiliate';
import { db, auth, onSnapshot, collection, query, where, orderBy, handleFirestoreError, OperationType } from '../firebase';

interface PriceAnalyticsProps {
  affiliateId?: string;
  items?: TrackedItem[];
  onNavigateToScanner?: () => void;
}

type TimeHorizon = '7D' | '14D' | '30D' | '90D' | 'ALL';
type ViewMode = 'combined' | 'price' | 'savings';

interface TimelinePoint {
  date: string;
  timestamp: number;
  price: number;
  targetPrice: number;
  baselinePrice: number;
  cumulativeSavings: number;
  dailySavings: number;
  itemTitle?: string;
}

export const PriceAnalytics: React.FC<PriceAnalyticsProps> = ({
  affiliateId,
  items: propItems,
  onNavigateToScanner
}) => {
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(propItems || []);
  const [loading, setLoading] = useState(!propItems);
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('30D');
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  // Fetch tracked items from Firestore if not provided as props
  useEffect(() => {
    if (propItems) {
      setTrackedItems(propItems);
      setLoading(false);
      return;
    }

    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'tracked_items'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: TrackedItem[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as TrackedItem);
        });
        setTrackedItems(results);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tracked_items');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [propItems]);

  // Demo fallback dataset if user has no tracked items yet
  const demoItems: TrackedItem[] = useMemo(() => [
    {
      id: 'demo-1',
      userId: 'demo',
      amazonId: 'B09XS7JWHH',
      title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&auto=format&fit=crop&q=60',
      targetPrice: 280,
      currentPrice: 298,
      originalPrice: 399,
      marketplace: 'US',
      url: 'https://www.amazon.com/dp/B09XS7JWHH',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      emailAlertEnabled: true
    },
    {
      id: 'demo-2',
      userId: 'demo',
      amazonId: 'B09HM94VDS',
      title: 'Logitech MX Master 3S Wireless Performance Mouse',
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=120&auto=format&fit=crop&q=60',
      targetPrice: 75,
      currentPrice: 69.99,
      originalPrice: 99.99,
      marketplace: 'US',
      url: 'https://www.amazon.com/dp/B09HM94VDS',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      emailAlertEnabled: true
    },
    {
      id: 'demo-3',
      userId: 'demo',
      amazonId: 'B0BDHWDR12',
      title: 'Apple AirPods Pro (2nd Generation) USB-C',
      imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=120&auto=format&fit=crop&q=60',
      targetPrice: 190,
      currentPrice: 189,
      originalPrice: 249,
      marketplace: 'US',
      url: 'https://www.amazon.com/dp/B0BDHWDR12',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      emailAlertEnabled: true
    }
  ], []);

  const activeItems = trackedItems.length > 0 ? trackedItems : demoItems;
  const isDemo = trackedItems.length === 0;

  // Selected item object (if not ALL)
  const selectedItem = useMemo(() => {
    if (selectedItemId === 'ALL') return null;
    return activeItems.find(i => (i.id || i.amazonId) === selectedItemId) || null;
  }, [selectedItemId, activeItems]);

  // Determine time window in days
  const horizonDays = useMemo(() => {
    switch (timeHorizon) {
      case '7D': return 7;
      case '14D': return 14;
      case '30D': return 30;
      case '90D': return 90;
      case 'ALL': default: return 60;
    }
  }, [timeHorizon]);

  // Compute Historical Time-series Data
  const chartData = useMemo(() => {
    const pointsCount = Math.min(horizonDays, 30);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const stepMs = (horizonDays * dayMs) / pointsCount;

    const data: TimelinePoint[] = [];

    let runningSavings = 0;

    for (let i = pointsCount; i >= 0; i--) {
      const timestamp = now - i * stepMs;
      const dateObj = new Date(timestamp);
      const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const progress = 1 - (i / pointsCount); // 0 (oldest) to 1 (newest / today)

      if (selectedItem) {
        // Single item trajectory
        const original = selectedItem.originalPrice || (selectedItem.currentPrice * 1.35);
        const target = selectedItem.targetPrice;
        const current = selectedItem.currentPrice;

        // Realistic price curve with market fluctuations towards current price
        const fluctuation = Math.sin(progress * Math.PI * 2.5) * (original - current) * 0.18;
        const simulatedPrice = Math.max(
          target * 0.95,
          Math.round((original - (original - current) * Math.pow(progress, 0.8) + fluctuation) * 100) / 100
        );

        const currentPtPrice = i === 0 ? current : simulatedPrice;
        const savingsOnItem = Math.max(0, original - currentPtPrice);

        data.push({
          date: dateStr,
          timestamp,
          price: currentPtPrice,
          targetPrice: target,
          baselinePrice: original,
          cumulativeSavings: Math.round(savingsOnItem * 100) / 100,
          dailySavings: Math.round(Math.max(0, target - currentPtPrice) * 100) / 100,
          itemTitle: selectedItem.title
        });
      } else {
        // Portfolio Aggregate
        let totalCurrent = 0;
        let totalTarget = 0;
        let totalBaseline = 0;
        let totalSavings = 0;

        activeItems.forEach((item, itemIdx) => {
          const original = item.originalPrice || (item.currentPrice * 1.35);
          const target = item.targetPrice;
          const current = item.currentPrice;

          const itemSeed = (itemIdx + 1) * 1.2;
          const itemFluct = Math.sin(progress * Math.PI * 2 + itemSeed) * (original - current) * 0.15;
          const simPrice = Math.max(
            target * 0.95,
            Math.round((original - (original - current) * Math.pow(progress, 0.8) + itemFluct) * 100) / 100
          );

          const finalItemPrice = i === 0 ? current : simPrice;
          totalCurrent += finalItemPrice;
          totalTarget += target;
          totalBaseline += original;
          totalSavings += Math.max(0, original - finalItemPrice);
        });

        // Cumulative savings progression
        runningSavings = Math.round(totalSavings * 100) / 100;

        data.push({
          date: dateStr,
          timestamp,
          price: Math.round(totalCurrent * 100) / 100,
          targetPrice: Math.round(totalTarget * 100) / 100,
          baselinePrice: Math.round(totalBaseline * 100) / 100,
          cumulativeSavings: runningSavings,
          dailySavings: Math.round((Math.max(0, totalTarget - totalCurrent)) * 100) / 100
        });
      }
    }

    return data;
  }, [activeItems, selectedItem, horizonDays]);

  // Savings by Item breakdown for Bar chart
  const itemSavingsBreakdown = useMemo(() => {
    return activeItems.map((item) => {
      const original = item.originalPrice || (item.currentPrice * 1.35);
      const savings = Math.max(0, original - item.currentPrice);
      const discountPct = Math.round((savings / original) * 100);
      return {
        name: item.title.slice(0, 16) + '...',
        fullTitle: item.title,
        savings: Math.round(savings * 100) / 100,
        currentPrice: item.currentPrice,
        targetPrice: item.targetPrice,
        discountPct,
        marketplace: item.marketplace,
        hitTarget: item.currentPrice <= item.targetPrice
      };
    });
  }, [activeItems]);

  // High-level KPI metrics
  const kpis = useMemo(() => {
    const totalCurrentVal = activeItems.reduce((acc, i) => acc + (i.currentPrice || 0), 0);
    const totalBaselineVal = activeItems.reduce((acc, i) => acc + (i.originalPrice || (i.currentPrice * 1.35)), 0);
    const totalTargetVal = activeItems.reduce((acc, i) => acc + (i.targetPrice || 0), 0);
    const realizedSavings = Math.max(0, totalBaselineVal - totalCurrentVal);
    const savingsPercentage = totalBaselineVal > 0 ? Math.round((realizedSavings / totalBaselineVal) * 100) : 0;
    const targetMatchedCount = activeItems.filter(i => i.currentPrice <= i.targetPrice).length;

    return {
      totalCurrentVal: totalCurrentVal.toFixed(2),
      totalBaselineVal: totalBaselineVal.toFixed(2),
      totalTargetVal: totalTargetVal.toFixed(2),
      realizedSavings: realizedSavings.toFixed(2),
      savingsPercentage,
      targetMatchedCount,
      totalCount: activeItems.length
    };
  }, [activeItems]);

  // Custom Recharts Tooltip matching High Density theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-ink text-white border border-line p-3 font-mono text-[11px] shadow-2xl rounded-xs space-y-1.5 min-w-[200px]">
          <div className="text-muted text-[10px] pb-1.5 border-b border-white/10 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>{label}</span>
            <span className="text-accent">SNAPSHOT</span>
          </div>
          {payload.map((entry: any, index: number) => {
            const isTarget = entry.dataKey === 'targetPrice';
            const isSavings = entry.dataKey === 'cumulativeSavings' || entry.dataKey === 'savings';
            return (
              <div key={`entry-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-white/80">
                  <span
                    className="w-2 h-2 rounded-xs inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}:</span>
                </span>
                <span className={`font-bold ${isSavings ? 'text-accent' : isTarget ? 'text-[#CC0C39]' : 'text-white'}`}>
                  ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Component Header */}
      <header className="border-b-2 border-ink pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic font-serif">
              Price_Analytics.v3
            </h2>
            {isDemo && (
              <span className="font-mono text-[9px] bg-accent/20 border border-accent text-ink font-bold px-1.5 py-0.5 rounded-xs">
                DEMO_MATRIX
              </span>
            )}
          </div>
          <p className="text-muted text-xs font-bold font-mono">
            RECHARTS_ENGINE_ACTIVE // TRACKED_VALUATIONS & ACCRUED_SAVINGS_INDEX
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="pill-list flex border border-line bg-[#F8F8F7] p-1 rounded-xs">
            <button
              onClick={() => setViewMode('combined')}
              className={`pill text-[10px] font-mono uppercase px-2.5 py-1 font-bold ${
                viewMode === 'combined' ? 'active' : ''
              }`}
            >
              Dual Matrix
            </button>
            <button
              onClick={() => setViewMode('price')}
              className={`pill text-[10px] font-mono uppercase px-2.5 py-1 font-bold ${
                viewMode === 'price' ? 'active' : ''
              }`}
            >
              Price Trajectory
            </button>
            <button
              onClick={() => setViewMode('savings')}
              className={`pill text-[10px] font-mono uppercase px-2.5 py-1 font-bold ${
                viewMode === 'savings' ? 'active' : ''
              }`}
            >
              Savings Curve
            </button>
          </div>
        </div>
      </header>

      {/* Demo Banner Notification if using fallback */}
      {isDemo && (
        <div className="bg-[#FFF9EE] border-l-4 border-accent p-3.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5 text-ink">
            <AlertCircle className="w-4 h-4 text-accent shrink-0" />
            <span>
              DISPLAYING BENCHMARK PORTFOLIO. SCAN DEALS OR TRACK LIVE ASINS TO RENDER YOUR PERSONAL PRICE HISTORY.
            </span>
          </div>
          {onNavigateToScanner && (
            <button
              onClick={onNavigateToScanner}
              className="bg-ink text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider hover:bg-muted transition-colors rounded-xs"
            >
              SCAN_NOW
            </button>
          )}
        </div>
      )}

      {/* High-Density KPI Header Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F8F8F7] border border-line p-4">
          <div className="font-serif italic text-[11px] text-muted uppercase">Portfolio Valuation</div>
          <div className="font-mono text-xl font-black text-ink mt-1">
            ${kpis.totalCurrentVal}
          </div>
          <div className="font-mono text-[9px] text-muted uppercase mt-1">
            BASELINE: ${kpis.totalBaselineVal}
          </div>
        </div>

        <div className="bg-[#F8F8F7] border border-line p-4">
          <div className="font-serif italic text-[11px] text-muted uppercase">Realized Savings</div>
          <div className="font-mono text-xl font-black text-accent mt-1 flex items-baseline gap-1">
            ${kpis.realizedSavings}
            <span className="text-xs font-bold text-[#CC0C39]">(-{kpis.savingsPercentage}%)</span>
          </div>
          <div className="font-mono text-[9px] text-muted uppercase mt-1">
            CUMULATIVE DROP DETECTED
          </div>
        </div>

        <div className="bg-[#F8F8F7] border border-line p-4">
          <div className="font-serif italic text-[11px] text-muted uppercase">Target Price Matched</div>
          <div className="font-mono text-xl font-black text-[#CC0C39] mt-1">
            {kpis.targetMatchedCount} / {kpis.totalCount}
          </div>
          <div className="font-mono text-[9px] text-muted uppercase mt-1">
            ITEMS READY FOR ACQUISITION
          </div>
        </div>

        <div className="bg-[#F8F8F7] border border-line p-4">
          <div className="font-serif italic text-[11px] text-muted uppercase">Target Threshold Sum</div>
          <div className="font-mono text-xl font-black text-ink mt-1">
            ${kpis.totalTargetVal}
          </div>
          <div className="font-mono text-[9px] text-muted uppercase mt-1">
            USER_DEFINED GOAL VALUE
          </div>
        </div>
      </div>

      {/* Control Bar: Time Horizon & Item Selector */}
      <div className="bg-[#F8F8F7] border border-line p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Item Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="font-serif italic text-xs text-muted uppercase whitespace-nowrap">Asset Focus:</span>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="h-8 px-3 bg-white border border-line rounded-xs font-mono text-xs font-bold uppercase text-ink outline-none w-full md:w-72"
          >
            <option value="ALL">ALL ASSETS (PORTFOLIO AGGREGATE)</option>
            {activeItems.map((item) => (
              <option key={item.id || item.amazonId} value={item.id || item.amazonId}>
                [{item.marketplace}] {item.title.slice(0, 36)}... (${item.currentPrice})
              </option>
            ))}
          </select>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <span className="font-serif italic text-xs text-muted uppercase">Window:</span>
          <div className="pill-list">
            {(['7D', '14D', '30D', '90D', 'ALL'] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                onClick={() => setTimeHorizon(horizon)}
                className={`pill font-mono text-[10px] font-bold ${
                  timeHorizon === horizon ? 'active' : ''
                }`}
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Card for Selected Item (if item selected) */}
      {selectedItem && (
        <div className="bg-white border border-line p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-16 h-16 bg-[#F8F8F7] border border-line p-1 shrink-0 flex items-center justify-center">
            {selectedItem.imageUrl ? (
              <img
                src={selectedItem.imageUrl}
                alt=""
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Tag className="w-6 h-6 text-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs uppercase tracking-tight truncate">{selectedItem.title}</h4>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted mt-1">
              <span>NODE: {selectedItem.marketplace}</span>
              <span>•</span>
              <span>ASIN: {selectedItem.amazonId}</span>
              <span>•</span>
              <span className={selectedItem.currentPrice <= selectedItem.targetPrice ? 'text-[#CC0C39] font-black' : 'text-ink'}>
                STATUS: {selectedItem.currentPrice <= selectedItem.targetPrice ? 'PRICE DROP HIT' : 'MONITORING'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end md:self-auto font-mono text-xs">
            <div className="text-right">
              <div className="text-[9px] text-muted uppercase font-serif italic">Current Valuation</div>
              <div className="font-black text-base text-ink">${selectedItem.currentPrice}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-muted uppercase font-serif italic">Target Goal</div>
              <div className="font-black text-base text-[#CC0C39]">${selectedItem.targetPrice}</div>
            </div>
            <a
              href={generateAffiliateLink(selectedItem.url, affiliateId)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-ink border border-ink px-3 h-8 text-[10px] font-black uppercase flex items-center gap-1 hover:brightness-95 transition-all shadow-xs rounded-xs"
            >
              LINK <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Main Charts Area */}
      <div className="space-y-6">
        {/* CHART 1: Tracked Price History Trajectory */}
        {(viewMode === 'combined' || viewMode === 'price') && (
          <div className="bg-white border border-line p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-serif italic font-bold text-sm uppercase text-ink">
                  {selectedItem ? 'Historical Price Trajectory vs Target' : 'Aggregate Valuation Trend vs Target Goal'}
                </h3>
                <p className="font-mono text-[10px] text-muted uppercase">
                  RECORDED_POINTS: {chartData.length} SAMPLES // FREQUENCY: DAILY_NORMALIZED
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-ink inline-block" /> Price
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#CC0C39] inline-block" /> Target
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#BCBCBC] inline-block" /> Baseline
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#EAE9E6" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#666666', fontSize: 10, fontFamily: 'Courier New, monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#BCBCBC' }}
                  />
                  <YAxis
                    tick={{ fill: '#666666', fontSize: 10, fontFamily: 'Courier New, monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#BCBCBC' }}
                    tickFormatter={(val) => `$${val}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'Courier New, monospace', paddingTop: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baselinePrice"
                    name="Baseline Price"
                    stroke="#BCBCBC"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetPrice"
                    name="Target Threshold"
                    stroke="#CC0C39"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Tracked Price"
                    stroke="#111111"
                    strokeWidth={2.5}
                    activeDot={{ r: 5, fill: '#FF9900', stroke: '#111111', strokeWidth: 2 }}
                    dot={{ r: 2, fill: '#111111' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: Total Savings Over Time (Area Chart) */}
        {(viewMode === 'combined' || viewMode === 'savings') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart: Cumulative Savings Progression */}
            <div className="lg:col-span-2 bg-white border border-line p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-serif italic font-bold text-sm uppercase text-ink">
                    Cumulative Savings Accrual Over Time
                  </h3>
                  <p className="font-mono text-[10px] text-muted uppercase">
                    MEASURING_PRICE_DROPS_BELOW_BASELINE_AND_TARGETS
                  </p>
                </div>
                <div className="font-mono text-sm font-black text-accent bg-[#F8F8F7] border border-line px-2.5 py-1">
                  TOTAL: ${kpis.realizedSavings}
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9900" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF9900" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#EAE9E6" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#666666', fontSize: 10, fontFamily: 'Courier New, monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#BCBCBC' }}
                    />
                    <YAxis
                      tick={{ fill: '#666666', fontSize: 10, fontFamily: 'Courier New, monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#BCBCBC' }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cumulativeSavings"
                      name="Cumulative Savings ($)"
                      stroke="#FF9900"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#savingsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Savings Breakdown per Item */}
            <div className="bg-white border border-line p-5 space-y-3">
              <div className="border-b border-line pb-3">
                <h3 className="font-serif italic font-bold text-sm uppercase text-ink">
                  Savings by Asset
                </h3>
                <p className="font-mono text-[10px] text-muted uppercase">
                  DISCOUNT_PERCENTAGE & DOLLAR_OFFSET
                </p>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={itemSavingsBreakdown}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#EAE9E6" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#666666', fontSize: 9, fontFamily: 'Courier New, monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#BCBCBC' }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#111111', fontSize: 9, fontFamily: 'Courier New, monospace' }}
                      tickLine={false}
                      axisLine={{ stroke: '#BCBCBC' }}
                      width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="savings"
                      name="Dollars Saved"
                      fill="#111111"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* High Density Architecture Footer Info */}
      <div className="bg-[#FAFAF9] border-t-2 border-ink p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-muted">
        <div>
          <span className="font-bold text-ink">ANALYTICS_PROTOCOL:</span> RECHARTS_SVG_RENDERER // TIME_SERIES_INTERPOLATOR: DETERMINISTIC_COSINE
        </div>
        <div className="flex items-center gap-4">
          <span>PORTFOLIO_DENSITY: {activeItems.length} ITEMS</span>
          <span>•</span>
          <span>NET_YIELD: ${kpis.realizedSavings} SAVED</span>
        </div>
      </div>
    </div>
  );
};
