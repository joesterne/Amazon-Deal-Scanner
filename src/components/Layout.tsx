import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Search, Bell, Globe, User, Share2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'scanner', label: 'Scan Deals', icon: Search },
    { id: 'tracker', label: 'Price Tracker', icon: Bell },
    { id: 'comparison', label: 'Compare', icon: Globe },
    { id: 'listing', label: 'Public Deals', icon: Share2 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent/30">
      {/* Top Header */}
      <header className="h-[60px] bg-white border-b border-line fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ink rounded-xs flex items-center justify-center">
            <ShoppingBag className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase whitespace-nowrap">AMZ.DEAL_PRO</h1>
        </div>

        <div className="hidden md:flex items-center gap-12 text-right">
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest">System Status</div>
            <div className="font-bold text-xs">ONLINE.ALPHA</div>
          </div>
          <div className="w-px h-8 bg-line" />
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Active Alerts</div>
            <div className="font-bold text-xs">Tracking Enabled</div>
          </div>
        </div>
      </header>

      <div className="flex pt-[60px] min-h-screen">
        {/* Sidebar */}
        <aside className="w-[200px] md:w-[240px] bg-[#F8F8F7] border-r border-line fixed top-[60px] bottom-0 overflow-y-auto p-5 space-y-8">
          <div>
            <div className="font-serif italic text-xs text-muted uppercase mb-4 tracking-wider">Navigation</div>
            <ul className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xs transition-colors text-xs font-bold uppercase tracking-tight ${
                        isActive 
                          ? 'bg-ink text-white' 
                          : 'hover:bg-[#EFEEEC] text-muted'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                      <span className="hidden md:block">{tab.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-8 border-t border-line">
            <div className="font-serif italic text-[10px] text-muted uppercase mb-2">Internal Index</div>
            <div className="font-mono text-[10px] text-muted leading-tight">
              SCAN_SEQ: 00923<br />
              SYS_LATENCY: 12ms<br />
              DATA_SRC: GEN_API
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-[200px] md:ml-[240px] flex-1 min-w-0 bg-white">
          <div className="min-h-full">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};
