/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, db, getDoc, doc, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Scanner } from './components/Scanner';

// Dynamic code-splitting for high-speed initial bundle payload
const PriceTracker = lazy(() => import('./components/PriceTracker').then(m => ({ default: m.PriceTracker })));
const PriceComparison = lazy(() => import('./components/PriceComparison').then(m => ({ default: m.PriceComparison })));
const PublicDeals = lazy(() => import('./components/PublicDeals').then(m => ({ default: m.PublicDeals })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));

const TabSuspenseFallback = () => (
  <div className="py-20 flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 border-2 border-ink border-t-accent animate-spin" />
    <span className="font-mono text-[10px] text-muted font-bold tracking-widest uppercase">
      STREAMING_MODULE...
    </span>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'scanner':
        return <Scanner affiliateId={userProfile?.affiliateId} />;
      case 'tracker':
        return (
          <Suspense fallback={<TabSuspenseFallback />}>
            <PriceTracker affiliateId={userProfile?.affiliateId} />
          </Suspense>
        );
      case 'comparison':
        return (
          <Suspense fallback={<TabSuspenseFallback />}>
            <PriceComparison affiliateId={userProfile?.affiliateId} />
          </Suspense>
        );
      case 'listing':
        return (
          <Suspense fallback={<TabSuspenseFallback />}>
            <PublicDeals />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<TabSuspenseFallback />}>
            <Profile userProfile={userProfile} onRefresh={() => auth.currentUser && fetchUserProfile(auth.currentUser.uid)} />
          </Suspense>
        );
      default:
        return <Scanner affiliateId={userProfile?.affiliateId} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-ink border-t-accent animate-spin" />
          <div className="font-mono text-[10px] font-bold text-muted uppercase tracking-[0.3em]">INITIALIZING_CORE...</div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
