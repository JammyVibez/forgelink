import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function seedInitialData() {
  try {
    // Seed Communities
    const comRef = doc(db, 'communities', 'c1');
    const comSnap = await getDoc(comRef);
    if (!comSnap.exists()) {
      console.log('Seeding communities...');
      await setDoc(doc(db, 'communities', 'c1'), {
        id: 'c1',
        name: 'CyberStrike (FPS)',
        description: 'Elite tactical strike teams and back-channel training logs. For reflex specialists.',
        icon: 'Target',
        category: 'Shooter'
      });
      await setDoc(doc(db, 'communities', 'c2'), {
        id: 'c2',
        name: 'Aegis Arena (MOBA)',
        description: 'Command center for lane routing and electronic deck setups.',
        icon: 'Shield',
        category: 'MOBA'
      });
      await setDoc(doc(db, 'communities', 'c3'), {
        id: 'c3',
        name: 'Neural Runners (RPG)',
        description: 'Sub-net hacking runs, cyberware upgrades, and cooperative neural chips.',
        icon: 'Cpu',
        category: 'RPG'
      });
    }

    // Seed Tournaments
    const tourneyRef = doc(db, 'tournaments', 't1');
    const tourneySnap = await getDoc(tourneyRef);
    if (!tourneySnap.exists()) {
      console.log('Seeding tournaments...');
      await setDoc(doc(db, 'tournaments', 't1'), {
        id: 't1',
        name: 'Nexus Masters Championship',
        game: 'Aegis Arena (MOBA)',
        status: 'Registration',
        slotsTotal: 8,
        slotsFilled: 4,
        teams: ['Neon Gliders', 'Spectre Squad', 'Aegis Hackers', 'Pixel Punx'],
        brackets: JSON.stringify({
          quarterfinals: [
            { id: 'm1', t1: 'Neon Gliders', t2: 'Spectre Squad', score1: null, score2: null, winner: null },
            { id: 'm2', t1: 'Aegis Hackers', t2: 'Pixel Punx', score1: null, score2: null, winner: null },
            { id: 'm3', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null },
            { id: 'm4', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null }
          ],
          semifinals: [
            { id: 'm5', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null },
            { id: 'm6', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null }
          ],
          finals: [
            { id: 'm7', t1: 'TBD', t2: 'TBD', score1: null, score2: null, winner: null }
          ]
        }),
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'tournaments', 't2'), {
        id: 't2',
        name: 'CyberStrike Cyber Cup',
        game: 'CyberStrike (FPS)',
        status: 'Ongoing',
        slotsTotal: 4,
        slotsFilled: 4,
        teams: ['Valkyrie Unit', 'Ghost Protocol', 'Matrix Assassins', 'Grid Runners'],
        brackets: JSON.stringify({
          semifinals: [
            { id: 'm1', t1: 'Valkyrie Unit', t2: 'Ghost Protocol', score1: 13, score2: 9, winner: 'Valkyrie Unit' },
            { id: 'm2', t1: 'Matrix Assassins', t2: 'Grid Runners', score1: 11, score2: 13, winner: 'Grid Runners' }
          ],
          finals: [
            { id: 'm3', t1: 'Valkyrie Unit', t2: 'Grid Runners', score1: null, score2: null, winner: null }
          ]
        }),
        createdAt: new Date().toISOString()
      });
    }

    // Seed Cyber Gamers (for recruitment pool in AI Squads)
    const gamerRef = doc(db, 'users', 'u2');
    const gamerSnap = await getDoc(gamerRef);
    if (!gamerSnap.exists()) {
      console.log('Seeding matchmaking pool gamers...');
      await setDoc(doc(db, 'users', 'u2'), {
        id: 'u2',
        username: 'HexValkyrie',
        avatar: 'avatar2',
        theme: 'cyberpunk',
        rankClass: 'Diamond',
        gamesPlaying: ['CyberStrike (FPS)', 'Aegis Arena (MOBA)'],
        playstyle: 'Hyper-Aggressive Entry',
        bio: 'Reflexes overclocked to 120Hz. Hacking networks and taking entry frags.',
        credits: 150,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'users', 'u3'), {
        id: 'u3',
        username: 'ZeroCool_99',
        avatar: 'avatar3',
        theme: 'matrix',
        rankClass: 'Platinum',
        gamesPlaying: ['CyberStrike (FPS)', 'Neural Runners (RPG)'],
        playstyle: 'Tactical Sniper',
        bio: 'Operating from the shadows. Systems override active, scope aligned.',
        credits: 245,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'users', 'u4'), {
        id: 'u4',
        username: 'ChronoMage',
        avatar: 'avatar4',
        theme: 'synthwave',
        rankClass: 'Gold',
        gamesPlaying: ['Aegis Arena (MOBA)', 'Neural Runners (RPG)'],
        playstyle: 'Support Commander',
        bio: 'Orchestrating mid-lane rotations and optimizing squad deck cooldowns.',
        credits: 80,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'users', 'u5'), {
        id: 'u5',
        username: 'GhostAgent',
        avatar: 'avatar5',
        theme: 'neon',
        rankClass: 'Master',
        gamesPlaying: ['CyberStrike (FPS)'],
        playstyle: 'Stealth Lurker',
        bio: 'Ghost protocol engaged. Silencing targets behind deep ice firewalls.',
        credits: 420,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Failed to seed initial database:', err);
  }
}
