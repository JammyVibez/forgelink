import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Shield, Key, Mail, User, Radio, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (userProfile: any) => void;
  triggerNotification: (content: string) => void;
}

export default function AuthView({ onAuthSuccess, triggerNotification }: AuthViewProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [playstyle, setPlaystyle] = useState('Strategic Shot-Caller');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !username)) {
      setError('Please provide all mandatory interface coordinates.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Construct standard gamer profile
        const newProfile = {
          id: user.uid,
          username: username.trim(),
          avatar: 'avatar' + Math.floor(Math.random() * 5 + 1),
          theme: 'cyberpunk',
          rankClass: 'Bronze',
          gamesPlaying: ['Apex Arena (FPS)', 'League of Tactics (RTS)'],
          playstyle: playstyle,
          bio: 'Newly synchronized gaming unit. Grid node active.',
          credits: 500,
          createdAt: new Date().toISOString()
        };

        // Persist profile to Firestore
        await setDoc(doc(db, 'users', user.uid), newProfile);
        
        triggerNotification(`Secure link established: Gamer profile ${newProfile.username} initialized`);
        onAuthSuccess(newProfile);
      } else {
        // Sign in user in Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user profile from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data();
          triggerNotification(`Access granted: Synced deck terminal for ${profile.username}`);
          onAuthSuccess(profile);
        } else {
          // If profile doc doesn't exist, create fallback
          const fallbackProfile = {
            id: user.uid,
            username: user.email?.split('@')[0] || 'Unknown_Grid_Unit',
            avatar: 'avatar1',
            theme: 'cyberpunk',
            rankClass: 'Bronze',
            gamesPlaying: ['Apex Arena (FPS)'],
            playstyle: 'Strategic Shot-Caller',
            bio: 'Synchronized deck unit.',
            credits: 100,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, fallbackProfile);
          triggerNotification(`Linked profile recovered and initialized`);
          onAuthSuccess(fallbackProfile);
        }
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Network sync failed. Please check grid connection.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || (err.message && err.message.includes('invalid-credential'))) {
        errMsg = 'Invalid cipher keys or grid ID (invalid email or password).';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email signal coordinate is already registered.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Cipher keys must contain at least 6 core symbols.';
      } else if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        errMsg = "Email/Password sign-in is disabled in your Firebase project. To enable it:\n\n1. Go to the Firebase Console\n2. Open 'Authentication' under the Build section\n3. Select the 'Sign-in method' tab\n4. Add / enable the 'Email/Password' provider\n\nAlternatively, you can bypass this and use the application immediately by clicking the 'Bypass Auth (Simulated Guest Session)' button below!";
      } else if (err.code === 'auth/network-request-failed' || (err.message && err.message.includes('network-request-failed'))) {
        errMsg = "A network error occurred while communicating with Firebase. This can happen due to sandbox environment constraints or connectivity limits.\n\nYou can bypass this error and enter the app instantly by clicking the 'Bypass Auth (Simulated Guest Session)' button below!";
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      triggerNotification('Access Denied: Terminal auth handshake failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    // A quick way for users to test without creating an account
    const demoProfile = {
      id: 'demo_guest_' + Math.floor(Math.random() * 1000),
      username: 'Guest_Decker_' + Math.floor(Math.random() * 900 + 100),
      avatar: 'avatar3',
      theme: 'neon',
      rankClass: 'Gold',
      gamesPlaying: ['CyberStrike (FPS)', 'Sim Grid'],
      playstyle: 'Hyper-Aggressive Entry',
      bio: 'Ephemeral guest session. Terminal bypass active.',
      credits: 250,
      createdAt: new Date().toISOString()
    };
    triggerNotification('Guest terminal access active. Sandbox mode enabled.');
    onAuthSuccess(demoProfile);
  };

  return (
    <div id="auth-container" className="max-w-md mx-auto my-12 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cyber Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 mb-3 shadow-lg shadow-amber-500/5">
          <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <h2 className="font-mono text-xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
          FORGELINK CORE ACCESS
        </h2>
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
          {isRegistering ? 'Register new digital deck signature' : 'Enter security authorization credentials'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-3">
          <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-red-400 leading-normal whitespace-pre-line">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegistering && (
          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1.5">Gamer Alias / Tag</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
                placeholder="e.g. RogueDecker"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1.5">Email Coordinate</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="e.g. user@grid.com"
            />
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1.5">Security Cipher (Password)</label>
          <div className="relative">
            <Key className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
        </div>

        {isRegistering && (
          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1.5">Tactical Playstyle</label>
            <select
              value={playstyle}
              onChange={(e) => setPlaystyle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
            >
              <option value="Strategic Shot-Caller">Strategic Shot-Caller</option>
              <option value="Hyper-Aggressive Entry">Hyper-Aggressive Entry</option>
              <option value="Tactical Support Anchor">Tactical Support Anchor</option>
              <option value="Stealth Flanker / Lurker">Stealth Flanker / Lurker</option>
              <option value="Intel Gatherer / Scout">Intel Gatherer / Scout</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-mono font-bold py-3 px-6 rounded-xl transition uppercase tracking-wider text-xs flex items-center justify-center gap-2 mt-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? 'Processing cipher validation...' : isRegistering ? 'Register Deck Profile' : 'Authenticate Console'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-zinc-800/60 text-center space-y-3">
        <p className="font-mono text-[11px] text-zinc-400">
          {isRegistering ? 'Already have a secure cyber signature?' : 'New to this sector of the grid?'}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-amber-400 hover:text-amber-300 ml-1.5 underline bg-transparent border-none cursor-pointer focus:outline-none font-bold"
          >
            {isRegistering ? 'Login Instead' : 'Create Account'}
          </button>
        </p>

        <div className="flex items-center justify-center gap-2 text-zinc-600 font-mono text-[10px]">
          <div className="h-px bg-zinc-800 flex-1" />
          <span>OR</span>
          <div className="h-px bg-zinc-800 flex-1" />
        </div>

        <button
          onClick={handleDemoSignIn}
          className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-xs py-2 px-4 rounded-xl transition uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <span>Bypass Auth (Simulated Guest Session)</span>
        </button>
      </div>
    </div>
  );
}
