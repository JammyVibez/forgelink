import { useState, useEffect, FormEvent } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Users, Calendar, Target, Plus, Shield, Loader2 } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  game: string;
  status: string;
  slotsTotal: number;
  slotsFilled: number;
  teams: string[];
  brackets: string; // JSON serialized string of brackets
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

interface TournamentViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  isLightMode?: boolean;
}

export default function TournamentView({ currentUser, triggerNotification, isLightMode }: TournamentViewProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [teamName, setTeamName] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const q = collection(db, 'tournaments');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tourneys: Tournament[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tourneys.push({
          id: doc.id,
          name: data.name,
          game: data.game,
          status: data.status,
          slotsTotal: data.slotsTotal,
          slotsFilled: data.slotsFilled,
          teams: data.teams || [],
          brackets: data.brackets || '{}'
        });
      });
      setTournaments(tourneys);
      if (tourneys.length > 0 && !activeTournament) {
        setActiveTournament(tourneys[0]);
      } else if (activeTournament) {
        // Keep active selection in sync with fresh Firestore snapshots
        const updated = tourneys.find(t => t.id === activeTournament.id);
        if (updated) setActiveTournament(updated);
      }
    }, (error) => {
      console.error(error);
      // Fallback tournaments
      setTournaments([
        {
          id: 't1',
          name: 'Nexus Masters 2026',
          game: 'Aegis Arena (MOBA)',
          status: 'Registration',
          slotsTotal: 8,
          slotsFilled: 4,
          teams: ['Neon Gliders', 'Spectre Squad', 'Aegis Hackers', 'Pixel Punx'],
          brackets: JSON.stringify({
            semifinals: [
              { id: 'm1', t1: 'Neon Gliders', t2: 'Spectre Squad', score1: null, score2: null, winner: null },
              { id: 'm2', t1: 'Aegis Hackers', t2: 'Pixel Punx', score1: null, score2: null, winner: null }
            ],
            finals: [
              { id: 'm3', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null }
            ]
          })
        }
      ]);
    });

    return () => unsubscribe();
  }, [activeTournament]);

  const handleRegisterTeam = async (e: FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !activeTournament || registering) return;

    if (activeTournament.slotsFilled >= activeTournament.slotsTotal) {
      triggerNotification('Tournament is full! Registration protocol closed.');
      return;
    }

    setRegistering(true);
    try {
      const newTeams = [...activeTournament.teams, teamName];
      const newSlotsFilled = activeTournament.slotsFilled + 1;

      // Parse current brackets, find the first TBD slot, and replace it with our team!
      const bracketObj = JSON.parse(activeTournament.brackets);
      let replaced = false;

      // Scan through brackets to replace first TBD
      for (const round of Object.keys(bracketObj)) {
        for (const match of bracketObj[round]) {
          if (match.t1 === 'TBD' && !replaced) {
            match.t1 = teamName;
            replaced = true;
          } else if (match.t2 === 'TBD' && !replaced) {
            match.t2 = teamName;
            replaced = true;
          }
        }
      }

      const tourneyRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tourneyRef, {
        teams: newTeams,
        slotsFilled: newSlotsFilled,
        brackets: JSON.stringify(bracketObj)
      });

      setTeamName('');
      triggerNotification(`Validated: Team "${teamName}" registered in league brackets!`);
    } catch (err) {
      console.error(err);
      triggerNotification('Brackets write error: Synchronizer node offline');
    } finally {
      setRegistering(false);
    }
  };

  const getBracketData = (bracketsStr: string) => {
    try {
      return JSON.parse(bracketsStr);
    } catch {
      return {};
    }
  };

  const bracketData = activeTournament ? getBracketData(activeTournament.brackets) : {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Active Leagues Sidebar */}
      <div className="lg:col-span-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur h-fit">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-zinc-800">
          <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 className="font-mono text-sm text-white uppercase tracking-wider">Leagues Node</h2>
        </div>

        <div className="space-y-3">
          {tournaments.map((tourney) => (
            <button
              key={tourney.id}
              onClick={() => setActiveTournament(tourney)}
              className={`w-full p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                activeTournament?.id === tourney.id
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[10px] text-zinc-500 uppercase">{tourney.game}</span>
                <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded ${
                  tourney.status === 'Registration'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                }`}>
                  {tourney.status}
                </span>
              </div>
              <h4 className="font-mono text-xs text-white uppercase font-black tracking-wide leading-tight">{tourney.name}</h4>
              <p className="font-mono text-[10px] text-zinc-500 uppercase mt-1">
                Slots: {tourney.slotsFilled} / {tourney.slotsTotal} filled
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Bracket Board and Registration */}
      <div className="lg:col-span-3 space-y-6">
        {activeTournament && (
          <>
            {/* Brackets Visual Card */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 backdrop-blur">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                <div>
                  <h3 className="font-mono text-lg text-white uppercase font-black tracking-wider flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    {activeTournament.name}
                  </h3>
                  <p className="font-mono text-xs text-zinc-500 mt-1">{activeTournament.game}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span className="font-mono text-xs text-zinc-400">
                    {activeTournament.slotsFilled} / {activeTournament.slotsTotal} Competitors
                  </span>
                </div>
              </div>

              {/* Tournament Visual Brackets rendering */}
              <div className="flex flex-col md:flex-row justify-around items-center gap-6 py-4 overflow-x-auto">
                {Object.keys(bracketData).map((round, rIndex) => (
                  <div key={round} className="space-y-8 min-w-[200px] text-center">
                    <h5 className="font-mono text-[10px] text-amber-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">
                      {round}
                    </h5>

                    <div className="space-y-6">
                      {bracketData[round].map((match: any) => (
                        <div
                          key={match.id}
                          className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden text-xs text-left font-mono"
                        >
                          {/* Competitor Team 1 */}
                          <div className={`p-3 border-b border-zinc-900 flex justify-between items-center ${
                            match.winner === match.t1 ? 'bg-amber-500/5 text-amber-500' : 'text-zinc-300'
                          }`}>
                            <span className="truncate max-w-[120px] font-bold">{match.t1}</span>
                            <span className="font-black text-white">{match.score1 !== null ? match.score1 : '-'}</span>
                          </div>

                          {/* Competitor Team 2 */}
                          <div className={`p-3 flex justify-between items-center ${
                            match.winner === match.t2 ? 'bg-amber-500/5 text-amber-500' : 'text-zinc-300'
                          }`}>
                            <span className="truncate max-w-[120px] font-bold">{match.t2}</span>
                            <span className="font-black text-white">{match.score2 !== null ? match.score2 : '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Form (only display if status is Registration) */}
            {activeTournament.status === 'Registration' && (
              <div id="registration-form" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h4 className="font-mono text-sm text-white uppercase tracking-wider">Bracket Combat Entry</h4>
                </div>
                <p className="font-mono text-xs text-zinc-500 mb-5 leading-relaxed">
                  Enter your custom team alias to occupy an empty slot in the tournament brackets. Synchronizing matches dynamically across active gaming decks.
                </p>

                <form onSubmit={handleRegisterTeam} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition placeholder-zinc-700"
                    placeholder="Enter custom team tag..."
                    maxLength={20}
                    required
                  />
                  <button
                    type="submit"
                    disabled={registering || !teamName.trim()}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-mono font-bold py-3 px-6 rounded-xl transition uppercase tracking-wider text-xs flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Synchronizing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Register Team
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
