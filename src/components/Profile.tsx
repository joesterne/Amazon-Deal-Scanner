import React, { useState, useEffect } from 'react';
import { User, LogOut, Save, BadgeCheck, ShieldCheck } from 'lucide-react';
import { auth, db, logout, signInWithGoogle, getDoc, setDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface ProfileProps {
  userProfile: UserProfile | null;
  onRefresh: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ userProfile, onRefresh }) => {
  const [affiliateId, setAffiliateId] = useState(userProfile?.affiliateId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setAffiliateId(userProfile.affiliateId || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        affiliateId,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        createdAt: userProfile?.createdAt || Timestamp.now()
      }, { merge: true });
      onRefresh();
      alert('Settings saved!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
    setSaving(false);
  };

  if (!auth.currentUser) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-white p-8 border border-line text-center space-y-8">
          <div className="w-16 h-16 bg-[#F8F8F7] border border-line mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-muted" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black font-serif italic uppercase tracking-tighter">Auth_Required</h2>
            <p className="text-muted text-xs font-mono leading-relaxed">Join the decentralized exchange for monitored price data and shared affiliate listings.</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full bg-ink text-white py-4 text-xs font-black uppercase tracking-widest hover:bg-muted transition-all"
          >
            EXECUTE_GOOGLE_AUTH
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-12">
      <header className="flex items-center gap-6 border-b-2 border-ink pb-8">
        <div className="relative">
          <img
            src={auth.currentUser.photoURL || ''}
            alt="Profile"
            className="w-20 h-20 border border-line p-1 bg-white"
          />
          <BadgeCheck className="absolute -bottom-2 -right-2 w-6 h-6 text-accent bg-white border border-line p-1" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">{auth.currentUser.displayName}</h2>
          <p className="text-muted font-mono text-[10px] tracking-tight mt-1 uppercase">{auth.currentUser.email}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-[#F8F8F7] p-8 border border-line space-y-8">
          <div className="space-y-4">
            <h3 className="font-serif italic text-xs text-muted uppercase tracking-wider">Affiliate Configuration_v4</h3>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-ink uppercase">Amazon Associate Tag</label>
              <input
                type="text"
                placeholder="E.G. YOURNAME-20"
                className="w-full h-11 px-4 bg-white border border-line focus:border-ink outline-none font-mono text-xs"
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
              />
              <p className="text-[10px] text-muted font-mono leading-tight">
                // STRING_APPENDED_TO_ALL_OUTBOUND_CHANNELS
              </p>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-ink text-white h-12 text-xs font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? 'SAVING...' : 'COMMIT_CHANGES'}
            </button>
            <button
              onClick={logout}
              className="px-6 h-12 border border-line bg-white text-muted hover:text-[#CC0C39] hover:bg-[#FFF2F2] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
