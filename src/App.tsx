import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, query, collection, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { seedInitialData } from './lib/firebaseSeeder';
import { VerifiedBadge, AppNotification } from './lib/tagging';

// Sub-views
import StreamView from './components/StreamView';
import FeedView from './components/FeedView';
import CommunitiesView from './components/CommunitiesView';
import TournamentView from './components/TournamentView';
import DirectMessagesView from './components/DirectMessagesView';
import AISquadsView from './components/AISquadsView';
import ShopSettingsView from './components/ShopSettingsView';
import AuthView from './components/AuthView';
import ProfileView from './components/ProfileView';

// Icons
import {
  Tv,
  Flame,
  MessageSquare,
  Trophy,
  Lock,
  Cpu,
  Sliders,
  Bell,
  Terminal,
  Activity,
  User,
  ShieldCheck,
  Signal,
  RefreshCw,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  theme: string;
  rankClass: string;
  gamesPlaying: string[];
  playstyle: string;
  bio: string;
  credits: number;
  isLightMode?: boolean;
  isPro?: boolean;
  pfpUrl?: string;
  coverBanner?: string;
}

export default function App() {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('stream');
  const [notification, setNotification] = useState<string | null>(null);
  const [dbSeeded, setDbSeeded] = useState(false);

  // Social Profile State mapping
  const [viewedProfileUserId, setViewedProfileUserId] = useState<string | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);

  // Notifications & Deep Navigation coordination states
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [preselectedChatUserId, setPreselectedChatUserId] = useState<string | null>(null);

  // Sync user notifications in real-time
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      setNotifications(list);
    }, (error) => {
      console.warn("Notifications sync failed:", error);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // 1. Initial Seeding & Firebase Auth Listener
  useEffect(() => {
    // Read URL query parameters for profile sharing
    const params = new URLSearchParams(window.location.search);
    const sharedProfileId = params.get('profile');
    if (sharedProfileId) {
      setViewedProfileUserId(sharedProfileId);
      setActiveTab('profile');
    }

    async function initDbAndAuth() {
      // Seed Firestore with static entities if missing
      try {
        await seedInitialData();
        setDbSeeded(true);
      } catch (seedErr) {
        console.warn('Seeding skipped or already populated:', seedErr);
      }

      // Sync with Firebase Auth state changed
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              setCurrentUser(data);
              setIsLightMode(!!data.isLightMode);
            } else {
              // Construct and save new user profile if doc not present yet
              const initialProfile: UserProfile = {
                id: firebaseUser.uid,
                username: firebaseUser.email?.split('@')[0] || 'Gamer_' + Math.floor(Math.random() * 1000),
                avatar: 'avatar' + Math.floor(Math.random() * 5 + 1),
                theme: 'cyberpunk',
                rankClass: 'Bronze',
                gamesPlaying: ['Apex Arena (FPS)', 'League of Tactics (RTS)'],
                playstyle: 'Strategic Shot-Caller',
                bio: 'Fully synced core grid user.',
                credits: 200,
                isLightMode: false
              };
              await setDoc(userRef, initialProfile);
              setCurrentUser(initialProfile);
              setIsLightMode(false);
            }
            setIsAuthenticated(true);
          } catch (err) {
            console.warn('Firestore load failed, creating local offline backup session:', err);
            // Fallback backup if offline
            const fallback: UserProfile = {
              id: firebaseUser.uid,
              username: firebaseUser.email?.split('@')[0] || 'Offline_Warrior',
              avatar: 'avatar1',
              theme: 'cyberpunk',
              rankClass: 'Silver',
              gamesPlaying: ['Offline Grid'],
              playstyle: 'Strategic Shot-Caller',
              bio: 'Backup offline node signature.',
              credits: 100,
              isLightMode: false
            };
            setCurrentUser(fallback);
            setIsLightMode(false);
            setIsAuthenticated(true);
          }
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoadingAuth(false);
      });

      return unsubscribe;
    }
    
    initDbAndAuth();
  }, []);

  // Display top right sliding cyber deck notification
  const triggerNotification = (content: string) => {
    setNotification(content);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateUser = async (updatedFields: Partial<UserProfile>) => {
    if (currentUser) {
      const merged = { ...currentUser, ...updatedFields };
      setCurrentUser(merged);
      if (updatedFields.isLightMode !== undefined) {
        setIsLightMode(updatedFields.isLightMode);
      }
      try {
        const userRef = doc(db, 'users', currentUser.id);
        await setDoc(userRef, merged, { merge: true });
      } catch (e) {
        console.warn('Could not persist updated profile:', e);
      }
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setIsLightMode(!!profile.isLightMode);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      triggerNotification('Terminal Session severed. System logging out.');
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      // Backup guest session reset
      setCurrentUser(null);
      setIsAuthenticated(false);
      triggerNotification('Session destroyed');
    }
  };

  // Map user deck selection to specific global Tailwind utility classes
  const themeStyles = {
    cyberpunk: {
      accent: 'amber-500',
      border: 'border-amber-500/20',
      text: 'text-amber-500',
      bg: 'bg-amber-500',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      nav: 'text-amber-500 border-amber-500'
    },
    neon: {
      accent: 'green-500',
      border: 'border-green-500/20',
      text: 'text-green-500',
      bg: 'bg-green-500',
      glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
      nav: 'text-green-500 border-green-500'
    },
    synthwave: {
      accent: 'pink-500',
      border: 'border-pink-500/20',
      text: 'text-pink-500',
      bg: 'bg-pink-500',
      glow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]',
      nav: 'text-pink-500 border-pink-500'
    },
    matrix: {
      accent: 'emerald-500',
      border: 'border-emerald-500/20',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      nav: 'text-emerald-500 border-emerald-500'
    },
    plasma: {
      accent: 'blue-500',
      border: 'border-blue-500/20',
      text: 'text-blue-500',
      bg: 'bg-blue-500',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
      nav: 'text-blue-500 border-blue-500'
    }
  };

  // Safe fallback selection if theme is unmapped
  const activeTheme = currentUser ? (themeStyles[currentUser.theme as keyof typeof themeStyles] || themeStyles.cyberpunk) : themeStyles.cyberpunk;

  const tabs = [
    { id: 'stream', label: 'Stream Hub', icon: <Tv className="w-4 h-4" /> },
    { id: 'feed', label: 'Net Signals', icon: <Flame className="w-4 h-4" /> },
    { id: 'profile', label: 'Identity Deck', icon: <User className="w-4 h-4" /> },
    { id: 'lobbies', label: 'Sectors', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'brackets', label: 'Leagues', icon: <Trophy className="w-4 h-4" /> },
    { id: 'chat', label: 'Secure DMs', icon: <Lock className="w-4 h-4" /> },
    { id: 'matchmaker', label: 'Matchmaker AI', icon: <Cpu className="w-4 h-4" /> },
    { id: 'settings', label: 'Deck Customize', icon: <Sliders className="w-4 h-4" /> }
  ];

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono text-xs text-zinc-500">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        VALIDATING GRID SIGNATURE...
      </div>
    );
  }

  // If not logged in, render gorgeous Login page
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6">
        <AuthView onAuthSuccess={handleAuthSuccess} triggerNotification={triggerNotification} />
      </div>
    );
  }

  return (
    <div 
      id="forge-link-root" 
      className={`min-h-screen transition-colors duration-200 selection:bg-amber-500 selection:text-black ${
        isLightMode ? 'bg-zinc-50 text-zinc-900' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      
      {/* HUD HEADER PANEL */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors duration-200 ${
        isLightMode ? 'bg-white/90 border-zinc-200' : 'bg-zinc-950/90 border-zinc-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border bg-zinc-900 ${activeTheme.border} ${activeTheme.glow}`}>
            <Terminal className={`w-5 h-5 ${activeTheme.text}`} />
          </div>
          <div>
            <h1 className={`font-mono text-base font-black tracking-widest uppercase flex items-center gap-2 ${
              isLightMode ? 'text-zinc-900' : 'text-white'
            }`}>
              ForgeLink <span className="text-[10px] bg-amber-500/15 px-1.5 py-0.5 rounded font-normal text-amber-500">v1.5</span>
            </h1>
            <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
              Connected Grid: Segment {currentUser.id.slice(0, 6)} | Ping: 12ms
            </p>
          </div>
        </div>

        {/* User stats widget */}
        <div className="flex items-center gap-4">
          {/* Status signal */}
          <div className={`hidden md:flex items-center gap-2 border px-3 py-1.5 rounded-xl ${
            isLightMode ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <Signal className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`font-mono text-[10px] uppercase ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>Signal Secure</span>
          </div>

          {/* Quick profile info - Clicking routes to own profile tab */}
          <button
            onClick={() => {
              setViewedProfileUserId(currentUser.id);
              setActiveTab('profile');
              triggerNotification('Terminal Routing: Opening user profile');
            }}
            className={`flex items-center gap-3 border px-3.5 py-1.5 rounded-xl transition text-left cursor-pointer ${
              isLightMode 
                ? 'bg-zinc-100 hover:bg-zinc-200/80 border-zinc-200' 
                : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/30'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${activeTheme.bg}`} />
            <div>
              <p className={`font-mono text-[11px] font-bold uppercase tracking-wide leading-none flex items-center gap-1 ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                {currentUser.username}
                <VerifiedBadge isPro={currentUser.isPro} size="xs" />
              </p>
              <p className="font-mono text-[8px] text-zinc-500 uppercase mt-0.5">{currentUser.rankClass} League</p>
            </div>
          </button>

          {/* Notification Center Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              title="Notifications Panel"
              className={`p-2 rounded-xl border transition cursor-pointer relative ${
                isLightMode 
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            
            {showNotificationsDropdown && (
              <div className={`absolute right-0 mt-3 w-80 rounded-2xl border p-4 shadow-2xl z-50 animate-slide-in font-mono ${
                isLightMode ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-850 text-white'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 border-zinc-800">
                  <h5 className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Signal Terminal Comms</h5>
                  <button 
                    onClick={async () => {
                      // Mark all as read
                      for (const notif of notifications) {
                        if (!notif.read) {
                          try {
                            await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                          } catch (err) {}
                        }
                      }
                      triggerNotification('Cleared notifications dashboard');
                    }}
                    className="text-[8px] text-amber-500 uppercase hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-[9px] text-zinc-500 text-center py-6 uppercase">Grid quiet. No signals received.</p>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={async () => {
                          // Mark as read
                          if (!notif.read) {
                            try {
                              await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                            } catch (err) {}
                          }
                          setShowNotificationsDropdown(false);
                          
                          // Handle navigation based on notification type
                          if (notif.type === 'tag' || notif.type === 'comment') {
                            setActiveTab('feed');
                          } else if (notif.type === 'dm') {
                            setPreselectedChatUserId(notif.senderId);
                            setActiveTab('chat');
                          } else if (notif.type === 'invite') {
                            setActiveTab('lobbies');
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left text-[10px] transition-all flex flex-col gap-1 cursor-pointer ${
                          notif.read 
                            ? isLightMode ? 'bg-zinc-50 border-zinc-100 text-zinc-600' : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
                            : isLightMode ? 'bg-amber-500/5 border-amber-500/20 text-zinc-900 font-bold' : 'bg-amber-500/5 border-amber-500/10 text-amber-500 font-bold'
                        }`}
                      >
                        <p className="leading-relaxed">{notif.text}</p>
                        <span className="text-[7px] text-zinc-500 uppercase">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Light/Dark Toggle */}
          <button
            onClick={() => {
              const newMode = !isLightMode;
              handleUpdateUser({ isLightMode: newMode });
              triggerNotification(`Theme adjusted: Switching to ${newMode ? 'White Deck Grid' : 'Dark Neural Deck'}`);
            }}
            title="Toggle Light/Dark Theme"
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isLightMode 
                ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
            }`}
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Log out quick key */}
          <button
            onClick={handleLogout}
            title="Log out session"
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isLightMode 
                ? 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-red-500 hover:border-red-500/40' 
                : 'bg-zinc-900 border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-500'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* TAB WORKSPACE BAR */}
        <div 
          id="tabs-bar" 
          className={`flex items-center overflow-x-auto gap-2 border-b pb-2 ${
            isLightMode ? 'border-zinc-200' : 'border-zinc-900'
          }`}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'profile') {
                    setViewedProfileUserId(currentUser.id);
                  }
                  setActiveTab(tab.id);
                  triggerNotification(`Routing deck terminal: ${tab.label}`);
                }}
                className={`font-mono text-xs py-3 px-4 rounded-xl border flex items-center gap-2 transition uppercase whitespace-nowrap ${
                  isActive
                    ? isLightMode
                      ? `bg-zinc-200 border-zinc-300 text-zinc-900 shadow-sm font-bold`
                      : `bg-zinc-900 border-${activeTheme.accent}/40 ${activeTheme.text} ${activeTheme.glow}`
                    : isLightMode
                      ? 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-200'
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE WORKSPACE GRID PANEL */}
        <div id="active-workspace-panel" className="min-h-[500px]">
          {activeTab === 'stream' && (
            <StreamView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
            />
          )}
          {activeTab === 'feed' && (
            <FeedView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
              onSelectUser={(id) => {
                setViewedProfileUserId(id);
                setActiveTab('profile');
              }}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileView
              userId={viewedProfileUserId || currentUser.id}
              currentUser={currentUser}
              isLightMode={isLightMode}
              onLogout={handleLogout}
              triggerNotification={triggerNotification}
              onSelectUser={(id) => {
                setViewedProfileUserId(id);
              }}
              onDirectMessage={(id) => {
                setPreselectedChatUserId(id);
                setActiveTab('chat');
              }}
            />
          )}
          {activeTab === 'lobbies' && (
            <CommunitiesView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
            />
          )}
          {activeTab === 'brackets' && (
            <TournamentView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
            />
          )}
          {activeTab === 'chat' && (
            <DirectMessagesView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
              preselectedUserId={preselectedChatUserId}
              onClearPreselected={() => setPreselectedChatUserId(null)}
            />
          )}
          {activeTab === 'matchmaker' && (
            <AISquadsView
              currentUser={currentUser}
              triggerNotification={triggerNotification}
              isLightMode={isLightMode}
            />
          )}
          {activeTab === 'settings' && (
            <ShopSettingsView
              currentUser={currentUser}
              isLightMode={isLightMode}
              onUpdateUser={handleUpdateUser}
              triggerNotification={triggerNotification}
            />
          )}
        </div>
      </main>

      {/* SECURE TERMINAL TOAST NOTIFICATION SLIDER */}
      {notification && (
        <div
          id="system-notification"
          className={`fixed bottom-6 right-6 z-50 border rounded-2xl p-4 w-80 shadow-2xl flex items-start gap-3 animate-slide-in duration-300 ${
            isLightMode ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'
          }`}
        >
          <div className={`p-2 rounded-lg border shrink-0 ${isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h5 className={`font-mono text-xs uppercase font-black tracking-wide ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Terminal Alert</h5>
            <p className={`font-mono text-[10px] mt-1 leading-relaxed ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {notification}
            </p>
          </div>
        </div>
      )}

      {/* FOOTER NETWORK METADATA LINES */}
      <footer className={`border-t mt-16 px-6 py-5 text-center flex flex-col sm:flex-row items-center justify-between font-mono text-[10px] gap-3 ${
        isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-zinc-900 bg-zinc-950 text-zinc-600'
      }`}>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>NETWORK CORE ACTIVE</span>
        </div>
        <p className="uppercase tracking-wider">
          © 2026 FORGELINK CYBER DECK FACILITY. NO WARRANTY IMPLIED.
        </p>
        <div className="flex items-center gap-1.5 uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>DATABASE HARMONIZED</span>
        </div>
      </footer>
    </div>
  );
}
