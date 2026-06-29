import { useState } from 'react';
import { Cpu, Target, HelpCircle, UserPlus, Users, Loader2 } from 'lucide-react';

interface RecommendedGamer {
  userId: string;
  username: string;
  roleMatch: string;
  compatibilityScore: number;
  reason: string;
}

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
}

interface AISquadsViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  isLightMode?: boolean;
}

export default function AISquadsView({ currentUser, triggerNotification, isLightMode }: AISquadsViewProps) {
  const [selectedGame, setSelectedGame] = useState('CyberStrike (FPS)');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedGamer[]>([]);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const games = ['CyberStrike (FPS)', 'Aegis Arena (MOBA)', 'Neural Runners (RPG)'];

  const fetchAIRecommendations = async () => {
    setLoading(true);
    try {
      // Mock some other online gamers in the lounge to send to the Gemini Matchmaker API
      const availableGamers = [
        { id: 'u2', username: 'HexValkyrie', playstyle: 'Hyper-Aggressive Entry', rank: 'Diamond', bio: 'Reflexes overclocked to 120Hz. Hacking networks and taking entry frags.' },
        { id: 'u3', username: 'ZeroCool_99', playstyle: 'Tactical Sniper', rank: 'Platinum', bio: 'Operating from the shadows. Systems override active, scope aligned.' },
        { id: 'u4', username: 'ChronoMage', playstyle: 'Support Commander', rank: 'Gold', bio: 'Orchestrating mid-lane rotations and optimizing squad deck cooldowns.' },
        { id: 'u5', username: 'GhostAgent', playstyle: 'Stealth Lurker', rank: 'Master', bio: 'Ghost protocol engaged. Silencing targets behind deep ice firewalls.' }
      ];

      const res = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: selectedGame,
          userPlaystyle: currentUser.playstyle,
          gamerTag: currentUser.username,
          availableGamers
        })
      });

      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        triggerNotification(`Matchmaker AI: Recruits matching ${selectedGame} generated`);
      } else {
        throw new Error('Invalid recommendations payload');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Lobby network error: Fallback squad loaded');
      // Direct client fallback
      setRecommendations([
        {
          userId: 'u2',
          username: 'HexValkyrie',
          roleMatch: 'Aggressive Entry Specialist',
          compatibilityScore: 94,
          reason: 'Your tactical coverage is the perfect anchor for their overclocked entry runs.'
        },
        {
          userId: 'u3',
          username: 'ZeroCool_99',
          roleMatch: 'High-Ground Cover Agent',
          compatibilityScore: 88,
          reason: 'Provides clean sniper coverage to watch your blind flanks while you push.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (userId: string, username: string) => {
    if (invitedIds.includes(userId)) return;
    setInvitedIds([...invitedIds, userId]);
    triggerNotification(`Signal dispatched: Secure squad invite sent to ${username}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Configuration Sidebar */}
      <div className="lg:col-span-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-zinc-800">
          <Cpu className="w-5 h-5 text-amber-500" />
          <h2 className="font-mono text-sm text-white uppercase tracking-wider">AI Target Lock</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-zinc-500 uppercase mb-2">Target Combat Game</label>
            <div className="flex flex-col gap-2">
              {games.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGame(g)}
                  className={`w-full p-3 rounded-xl border font-mono text-xs text-left transition ${
                    selectedGame === g
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/60 rounded-xl">
            <h4 className="font-mono text-xs text-zinc-400 uppercase mb-1">Your Identity Signature</h4>
            <p className="font-mono text-xs text-white truncate font-black">{currentUser.username}</p>
            <p className="font-mono text-[10px] text-zinc-500 uppercase mt-2">Playstyle: {currentUser.playstyle}</p>
          </div>

          <button
            onClick={fetchAIRecommendations}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-mono font-bold py-3 px-4 rounded-xl transition uppercase tracking-wider text-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Overclocking AI...
              </>
            ) : (
              'Query Matchmaker AI'
            )}
          </button>
        </div>
      </div>

      {/* Recommendations Results Dashboard */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 backdrop-blur">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-amber-500" />
              <h2 className="font-mono text-lg text-white uppercase tracking-wider">AI Matchmaking Matrix</h2>
            </div>
            <span className="font-mono text-xs text-zinc-500 uppercase">Status: Synced</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-zinc-700" />
              </div>
              <h3 className="font-mono text-sm text-zinc-400 uppercase mb-2">No Active Recruit Lock</h3>
              <p className="font-mono text-xs text-zinc-600 max-w-sm">
                Press "Query Matchmaker AI" to activate our neural deep search protocol and find optimal squad matches.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.userId}
                  className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5 hover:border-amber-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-mono text-sm text-white font-black">{rec.username}</h4>
                        <span className="font-mono text-[10px] text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {rec.roleMatch}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs text-zinc-500 block uppercase">Match Score</span>
                        <span className="font-mono text-lg font-black text-white">{rec.compatibilityScore}%</span>
                      </div>
                    </div>

                    <p className="font-mono text-xs text-zinc-400 border-t border-zinc-900 pt-3 mt-3 italic leading-relaxed">
                      &quot;{rec.reason}&quot;
                    </p>
                  </div>

                  <button
                    onClick={() => handleInvite(rec.userId, rec.username)}
                    disabled={invitedIds.includes(rec.userId)}
                    className={`w-full mt-5 font-mono text-xs py-2 px-4 rounded-lg transition uppercase flex items-center justify-center gap-2 ${
                      invitedIds.includes(rec.userId)
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-zinc-900 border border-zinc-800 text-white hover:border-amber-500 hover:text-amber-500'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {invitedIds.includes(rec.userId) ? 'Invite Transmitted' : 'Recruit To Squad'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Combat Roles Breakdown */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-zinc-500" />
            <h4 className="font-mono text-xs text-zinc-400 uppercase">Matchmaker Protocol Information</h4>
          </div>
          <p className="font-mono text-xs text-zinc-500 leading-relaxed">
            The AI Matchmaking algorithm calculates synchronization ratings using a multi-factor compatibility formula, evaluating gamer playstyles, reaction latency vectors, preferred combat maps, and psychological cooperative synergy.
          </p>
        </div>
      </div>
    </div>
  );
}
