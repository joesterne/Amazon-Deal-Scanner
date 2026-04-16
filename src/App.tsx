/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, getDoc, doc, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Scanner } from './components/Scanner';
import { PriceTracker } from './components/PriceTracker';
import { PriceComparison } from './components/PriceComparison';
import { PublicDeals } from './components/PublicDeals';
import { Profile } from './components/Profile';

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
        return <PriceTracker affiliateId={userProfile?.affiliateId} />;
      case 'comparison':
        return <PriceComparison affiliateId={userProfile?.affiliateId} />;
      case 'listing':
        return <PublicDeals />;
      case 'profile':
        return <Profile userProfile={userProfile} onRefresh={() => auth.currentUser && fetchUserProfile(auth.currentUser.uid)} />;
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

