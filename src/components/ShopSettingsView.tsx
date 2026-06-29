import { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Shield, 
  Sparkles, 
  User, 
  Palette, 
  Coins, 
  Target, 
  Moon, 
  Sun, 
  Bell, 
  Sliders, 
  Lock, 
  Check 
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
}

interface ShopSettingsViewProps {
  currentUser: UserProfile;
  isLightMode?: boolean;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  triggerNotification: (content: string) => void;
}

export default function ShopSettingsView({
  currentUser,
  isLightMode,
  onUpdateUser,
  triggerNotification
}: ShopSettingsViewProps) {
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [playstyle, setPlaystyle] = useState(currentUser.playstyle || 'Tactical Anchor');
  const [selectedTheme, setSelectedTheme] = useState(currentUser.theme);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar);
  const [saving, setSaving] = useState(false);

  // Behavior Settings (loaded from localStorage for immediate effect)
  const [muteByDefault, setMuteByDefault] = useState(false);
  const [anonymousGifts, setAnonymousGifts] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [spawnReactions, setSpawnReactions] = useState(true);

  useEffect(() => {
    // Load local device behavior states
    setMuteByDefault(localStorage.getItem('setting_mute_default') === 'true');
    setAnonymousGifts(localStorage.getItem('setting_anon_gifts') === 'true');
    setSoundAlerts(localStorage.getItem('setting_sound_alerts') !== 'false');
    setSpawnReactions(localStorage.getItem('setting_spawn_reactions') !== 'false');
  }, []);

  const handleTogglePreference = (key: string, currentValue: boolean, setter: (v: boolean) => void) => {
    const newVal = !currentValue;
    setter(newVal);
    localStorage.setItem(key, newVal.toString());
    triggerNotification(`Config updated: Preference saved to device storage.`);
  };

  const themes = [
    { id: 'cyberpunk', name: 'Cyberpunk Amber', primary: '#f59e0b', text: 'text-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
    { id: 'neon', name: 'Toxic Neon', primary: '#22c55e', text: 'text-green-500', border: 'border-green-500/30', bg: 'bg-green-500/10' },
    { id: 'synthwave', name: 'Synthwave Neon', primary: '#ec4899', text: 'text-pink-500', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
    { id: 'matrix', name: 'Matrix Digital', primary: '#10b981', text: 'text-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    { id: 'plasma', name: 'Deep Plasma', primary: '#3b82f6', text: 'text-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  ];

  const avatars = [
    { id: 'avatar1', label: 'Overclocker' },
    { id: 'avatar2', label: 'Circuit-Rider' },
    { id: 'avatar3', label: 'Signal-Ghost' },
    { id: 'avatar4', label: 'Net-Stalker' },
    { id: 'avatar5', label: 'Apex Operator' }
  ];

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const updates = {
        username,
        bio,
        playstyle,
        theme: selectedTheme,
        avatar: selectedAvatar
      };
      
      try {
        await updateDoc(userRef, updates);
      } catch {
        await setDoc(userRef, { id: currentUser.id, ...currentUser, ...updates }, { merge: true });
      }

      onUpdateUser(updates);
      triggerNotification('Deck synchronized: Core neural profile coordinates written.');
    } catch (err) {
      console.error(err);
      onUpdateUser({ username, bio, playstyle, theme: selectedTheme, avatar: selectedAvatar });
      triggerNotification('Profile updated locally (offline mode bypass)');
    } finally {
      setSaving(false);
    }
  };

  const handleBuyCosmetic = (cost: number, itemName: string) => {
    if (currentUser.credits < cost) {
      triggerNotification('Alert: Insufficient secure net credits!');
      return;
    }
    const updatedCredits = currentUser.credits - cost;
    onUpdateUser({ credits: updatedCredits });
    triggerNotification(`Decrypted: [${itemName}] unlocked! -${cost} Credits.`);
  };

  const handleFaucetClaims = () => {
    const payout = 500;
    const updatedCredits = currentUser.credits + payout;
    onUpdateUser({ credits: updatedCredits });
    triggerNotification(`Credits harvested: +${payout} CRD minted from faucet!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Profile & Preference controls */}
      <div 
        id="profile-settings-card" 
        className={`lg:col-span-2 border rounded-3xl p-6 backdrop-blur space-y-6 transition-colors ${
          isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}
      >
        <div className={`flex items-center gap-3 border-b pb-4 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
          <User className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 className={`font-mono text-base uppercase tracking-wider font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
            Identity Configuration
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-2">Gamer Alias / User Tag</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full border rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-amber-500 transition ${
                isLightMode 
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-900' 
                  : 'bg-zinc-950 border-zinc-800 text-white'
              }`}
              placeholder="e.g. NeoGamer"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-2">Tactical Combat Playstyle</label>
            <select
              value={playstyle}
              onChange={(e) => setPlaystyle(e.target.value)}
              className={`w-full border rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-amber-500 transition ${
                isLightMode 
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-950' 
                  : 'bg-zinc-950 border-zinc-800 text-white'
              }`}
            >
              <option value="Hyper-Aggressive Entry">Hyper-Aggressive Entry</option>
              <option value="Tactical Support Anchor">Tactical Support Anchor</option>
              <option value="Stealth Flanker / Lurker">Stealth Flanker / Lurker</option>
              <option value="Intel Gatherer / Scout">Intel Gatherer / Scout</option>
              <option value="Strategic Shot-Caller">Strategic Shot-Caller</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-2">Gamer Bio Signature</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full h-20 border rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-amber-500 transition resize-none ${
                isLightMode 
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-900' 
                  : 'bg-zinc-950 border-zinc-800 text-white'
              }`}
              placeholder="Input custom terminal bio signal..."
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-3">Custom Agent Avatars</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {avatars.map((av) => {
                const isSel = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`p-3 rounded-xl border font-mono text-[9px] uppercase transition flex flex-col items-center justify-center cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                        : isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-500 mb-1.5 text-[11px]">
                      {av.label[0]}
                    </div>
                    <span>{av.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-black font-mono font-bold py-3 px-6 rounded-xl transition uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{saving ? 'Synchronizing coordinates...' : 'Save Deck Configuration'}</span>
          </button>
        </div>

        {/* 2. LIVE APP BEHAVIOR SETTINGS SECTION */}
        <div className={`border-t pt-5 space-y-4 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800/80'}`}>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500 animate-pulse" />
            <h4 className={`font-mono text-xs uppercase tracking-wide font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
              Device Playback & Privacy Controls
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Toggle 1: Mute audios */}
            <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="space-y-0.5 max-w-[80%]">
                <span className={`font-mono text-xs font-bold block ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Mute on entrance</span>
                <span className="font-mono text-[9px] text-zinc-500 block">Do not playback sound automatically when viewing streams.</span>
              </div>
              <input 
                type="checkbox" 
                checked={muteByDefault} 
                onChange={() => handleTogglePreference('setting_mute_default', muteByDefault, setMuteByDefault)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Toggle 2: Show reactions */}
            <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="space-y-0.5 max-w-[80%]">
                <span className={`font-mono text-xs font-bold block ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Emoji reactions</span>
                <span className="font-mono text-[9px] text-zinc-500 block">Spawn dynamic floating reactions above active broadcast video.</span>
              </div>
              <input 
                type="checkbox" 
                checked={spawnReactions} 
                onChange={() => handleTogglePreference('setting_spawn_reactions', spawnReactions, setSpawnReactions)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Toggle 3: Chat sound alerts */}
            <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="space-y-0.5 max-w-[80%]">
                <span className={`font-mono text-xs font-bold block ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Chat sound notifications</span>
                <span className="font-mono text-[9px] text-zinc-500 block">Play a subtle cyber beep sound whenever new messages enter.</span>
              </div>
              <input 
                type="checkbox" 
                checked={soundAlerts} 
                onChange={() => handleTogglePreference('setting_sound_alerts', soundAlerts, setSoundAlerts)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Toggle 4: Anonymous tipping */}
            <label className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="space-y-0.5 max-w-[80%]">
                <span className={`font-mono text-xs font-bold block ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Anonymous tipping</span>
                <span className="font-mono text-[9px] text-zinc-500 block">Hide your username when transferring gift credits to broadcasters.</span>
              </div>
              <input 
                type="checkbox" 
                checked={anonymousGifts} 
                onChange={() => handleTogglePreference('setting_anon_gifts', anonymousGifts, setAnonymousGifts)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </label>

          </div>
        </div>

      </div>

      {/* Theme selection & credit wallets side grid */}
      <div className="space-y-6">
        
        {/* Wallet Creds Info & Faucet claims */}
        <div 
          id="wallet-creds-card" 
          className={`border rounded-3xl p-6 backdrop-blur flex items-center justify-between transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-amber-500 animate-pulse" />
            <div>
              <h3 className="font-mono text-[10px] text-zinc-500 uppercase">Secure Net Credits</h3>
              <p className={`font-mono text-2xl font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                {currentUser.credits} <span className="text-amber-500 text-xs font-bold uppercase">CRD</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleFaucetClaims}
            className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] py-2 px-3 rounded-xl transition uppercase font-bold cursor-pointer"
          >
            Claim 500 CRD
          </button>
        </div>

        {/* Pro Deck License Hub */}
        <div 
          id="pro-license-card" 
          className={`border rounded-3xl p-5 backdrop-blur transition-all duration-200 ${
            currentUser.isPro
              ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <Shield className={`w-7 h-7 ${currentUser.isPro ? 'text-amber-500' : 'text-zinc-500'}`} />
            <div>
              <h3 className="font-mono text-[10px] text-zinc-500 uppercase">License Matrix</h3>
              <p className={`font-mono text-xs font-black uppercase flex items-center gap-1 ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                {currentUser.isPro ? 'Verified Pro Deck' : 'Standard Deck'}
                {currentUser.isPro && <Check className="w-4 h-4 text-amber-500" />}
              </p>
            </div>
          </div>
          <p className="font-mono text-[9px] text-zinc-500 mb-3.5 leading-relaxed">
            Pro License grants: Unlimited community creations (normal capped at 1), Verified Gold Profile check badge, Community audio streams, and elite terminal access.
          </p>
          <button
            onClick={() => {
              const nextProState = !currentUser.isPro;
              if (nextProState) {
                // Charge 300 credits if they have them, else make it a free gift
                const charge = currentUser.credits >= 300 ? 300 : 0;
                onUpdateUser({ 
                  isPro: true, 
                  credits: currentUser.credits - charge 
                });
                triggerNotification(`License Upgraded: Neural grid verified. ${charge > 0 ? `Charged ${charge} CRD.` : 'Free developer trial license applied!'}`);
              } else {
                onUpdateUser({ isPro: false });
                triggerNotification('License Downgraded: Reverted to standard deck.');
              }
            }}
            className={`w-full py-2 px-3 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center ${
              currentUser.isPro
                ? 'bg-zinc-900/85 hover:bg-zinc-900 border border-amber-500/30 text-amber-500'
                : 'bg-amber-500 hover:bg-amber-600 text-black'
            }`}
          >
            {currentUser.isPro ? 'Downgrade to Standard' : 'Upgrade to Pro (300 CRD)'}
          </button>
        </div>

        {/* 1. VISUAL MODE INTEGRATED SWAPPER */}
        <div 
          id="visual-theme-card" 
          className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className={`flex items-center gap-3 mb-4 border-b pb-3.5 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <Sun className="w-5 h-5 text-amber-500" />
            <h2 className={`font-mono text-sm uppercase font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>App theme Mode</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isLightMode) {
                  onUpdateUser({ isLightMode: false });
                  triggerNotification('Deck switched: Dark mode active.');
                }
              }}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer font-mono text-[10px] uppercase font-bold ${
                !isLightMode
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-500'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Deck</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLightMode) {
                  onUpdateUser({ isLightMode: true });
                  triggerNotification('Deck switched: Light mode active.');
                }
              }}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer font-mono text-[10px] uppercase font-bold ${
                isLightMode
                  ? 'bg-zinc-100 border-zinc-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Grid</span>
            </button>
          </div>
        </div>

        {/* Visual deck Theme Selector */}
        <div 
          id="theme-selector-card" 
          className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className={`flex items-center gap-3 mb-4 border-b pb-3 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <Palette className="w-5 h-5 text-amber-500" />
            <h2 className={`font-mono text-sm uppercase font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Cyber Deck Colors</h2>
          </div>

          <div className="space-y-2">
            {themes.map((th) => {
              const isSel = selectedTheme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => {
                    setSelectedTheme(th.id);
                    onUpdateUser({ theme: th.id });
                    triggerNotification(`Accent updated: ${th.name} applied.`);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSel
                      ? `${th.border} ${th.bg}`
                      : isLightMode ? 'bg-zinc-50 border-zinc-200/80' : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: th.primary }} />
                    <span className={`font-mono text-xs uppercase ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{th.name}</span>
                  </div>
                  {isSel && (
                    <span className={`font-mono text-[8px] uppercase bg-amber-500/10 px-2 py-0.5 rounded font-black ${th.text}`}>
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cyber Deck Shop Items */}
        <div 
          id="cyber-deck-shop-card" 
          className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div className={`flex items-center gap-2.5 mb-4 border-b pb-3.5 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className={`font-mono text-xs uppercase font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Cosmetics Unlocked Shop</h2>
          </div>

          <div className="space-y-2.5">
            <div className={`flex items-center justify-between p-3 border rounded-xl ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div>
                <p className={`font-mono text-[11px] uppercase font-bold ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Neural Ping Sound Mod</p>
                <p className="font-mono text-[8px] text-zinc-500">Overlay alert sound acoustics</p>
              </div>
              <button
                onClick={() => handleBuyCosmetic(100, 'Neural Ping Sound Mod')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] font-black py-1.5 px-2.5 rounded-xl transition uppercase cursor-pointer"
              >
                100 CRD
              </button>
            </div>

            <div className={`flex items-center justify-between p-3 border rounded-xl ${
              isLightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div>
                <p className={`font-mono text-[11px] uppercase font-bold ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>Matrix HUD Skin</p>
                <p className="font-mono text-[8px] text-zinc-500">Override stream player overlay</p>
              </div>
              <button
                onClick={() => handleBuyCosmetic(250, 'Matrix HUD Skin')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] font-black py-1.5 px-2.5 rounded-xl transition uppercase cursor-pointer"
              >
                250 CRD
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
