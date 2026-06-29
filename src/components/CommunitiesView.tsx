import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VerifiedBadge, renderTaggedText, createNotification } from '../lib/tagging';
import { 
  MessageSquare, 
  Target, 
  Shield, 
  Cpu, 
  Send, 
  Radio, 
  Sparkles, 
  Plus, 
  Trash2, 
  UserMinus, 
  UserPlus, 
  Trophy, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  X, 
  Check, 
  Lock,
  ArrowDownRight
} from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  ownerId: string;
  isPro?: boolean;
  members?: string[]; // list of member user IDs
}

interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  channelId: string;
  createdAt: string;
  replyTo?: {
    senderName: string;
    content: string;
  } | null;
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
  isPro?: boolean;
}

interface CommunitiesViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  isLightMode?: boolean;
}

export default function CommunitiesView({ currentUser, triggerNotification, isLightMode }: CommunitiesViewProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [activeChannel, setActiveChannel] = useState('general-deck'); // 'general-deck', 'tactics-feed', 'lfg-signals', 'audio-uplink'
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Community creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('Shooter');
  const [createIcon, setCreateIcon] = useState('Cpu');

  // Community Admin states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [tourneyName, setTourneyName] = useState('');
  const [tourneySlots, setTourneySlots] = useState('8');

  // Replies coordination state
  const [replyingTo, setReplyingTo] = useState<ChannelMessage | null>(null);

  // Audio room coordination states
  const [inAudioCall, setInAudioCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<{ id: string; name: string; avatar: string; isSpeaking: boolean }[]>([]);
  const [voiceMeter, setVoiceMeter] = useState<number[]>([12, 18, 25, 45, 12, 8, 30, 22, 10, 5]);

  const channels = [
    { id: 'general-deck', label: '#general-deck' },
    { id: 'tactics-feed', label: '#tactics-feed' },
    { id: 'lfg-signals', label: '#lfg-signals' },
    { id: 'audio-uplink', label: '🔊 #audio-uplink (Voice Room)' }
  ];

  // Fetch Communities Real-time
  useEffect(() => {
    const q = collection(db, 'communities');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms: Community[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        comms.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          icon: data.icon,
          category: data.category,
          ownerId: data.ownerId || 'admin',
          isPro: !!data.isPro,
          members: data.members || []
        });
      });
      setCommunities(comms);
      if (comms.length > 0 && !activeCommunity) {
        setActiveCommunity(comms[0]);
      }
    }, (error) => {
      console.error(error);
      const mockComms = [
        { id: 'c1', name: 'CyberStrike (FPS)', description: 'Tactical shooter strategy and team logs.', icon: 'Target', category: 'Shooter', ownerId: 'system', isPro: true, members: [currentUser.id] },
        { id: 'c2', name: 'Aegis Arena (MOBA)', description: 'Lane mechanics, lane guides, and draft discussions.', icon: 'Shield', category: 'MOBA', ownerId: 'system', isPro: false, members: [] }
      ];
      setCommunities(mockComms);
      setActiveCommunity(mockComms[0]);
    });

    return () => unsubscribe();
  }, []);

  // Sync active community details if it updates in list
  useEffect(() => {
    if (!activeCommunity) return;
    const updated = communities.find(c => c.id === activeCommunity.id);
    if (updated) {
      setActiveCommunity(updated);
    }
  }, [communities]);

  // Fetch Messages for active community & channel
  useEffect(() => {
    if (!activeCommunity || activeChannel === 'audio-uplink') return;

    const q = query(
      collection(db, `communities/${activeCommunity.id}/messages`),
      where('channelId', '==', activeChannel),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChannelMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          channelId: data.channelId,
          createdAt: data.createdAt,
          replyTo: data.replyTo || null
        });
      });
      setMessages(msgs);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error(error);
      setMessages([
        { id: 'm1', senderId: 'u2', senderName: 'HexValkyrie', senderAvatar: 'avatar2', content: `Welcome to the ${activeChannel} comms node!`, channelId: activeChannel, createdAt: new Date().toISOString() },
        { id: 'm2', senderId: 'u3', senderName: 'ZeroCool_99', senderAvatar: 'avatar3', content: `Sync signal online. Deploying tactical protocols.`, channelId: activeChannel, createdAt: new Date().toISOString() }
      ]);
    });

    return () => unsubscribe();
  }, [activeCommunity, activeChannel]);

  // Audio voice room mock voice meter animation
  useEffect(() => {
    if (!inAudioCall || isMuted) return;
    const interval = setInterval(() => {
      setVoiceMeter(Array.from({ length: 12 }, () => Math.floor(Math.random() * 45) + 5));
    }, 120);
    return () => clearInterval(interval);
  }, [inAudioCall, isMuted]);

  // Handle Send Channel Message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeCommunity) return;

    try {
      const messageBody = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        content: newMessage,
        channelId: activeChannel,
        createdAt: new Date().toISOString(),
        replyTo: replyingTo ? { senderName: replyingTo.senderName, content: replyingTo.content } : null
      };

      await addDoc(collection(db, `communities/${activeCommunity.id}/messages`), messageBody);
      
      // Auto register mentions inside community messages
      const mentions = newMessage.match(/@\w+/g);
      if (mentions) {
        for (const mention of mentions) {
          const mentionedName = mention.replace('@', '');
          // Trigger persistent notifications for the tagged user
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', mentionedName));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const targetUser = snap.docs[0];
            await createNotification(
              targetUser.id,
              currentUser.id,
              currentUser.username,
              'mention',
              `tagged you in community sector ${activeCommunity.name}: "${newMessage.slice(0, 45)}..."`,
              activeCommunity.id
            );
          }
        }
      }

      setNewMessage('');
      setReplyingTo(null);
      triggerSimulatedTyping();
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          senderId: currentUser.id,
          senderName: currentUser.username,
          senderAvatar: currentUser.avatar,
          content: newMessage,
          channelId: activeChannel,
          createdAt: new Date().toISOString(),
          replyTo: replyingTo ? { senderName: replyingTo.senderName, content: replyingTo.content } : null
        }
      ]);
      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const triggerSimulatedTyping = () => {
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replies = [
          "Affirmative deck leader, signal received.",
          "Overclocking my cyber deck rig. Preparing for launch.",
          "Let's queue Aegis Arena rank sector 4. High reward points there.",
          "Check the latest tournament listing. Calibration finalized."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const responders = [
          { id: 'u2', name: 'HexValkyrie', avatar: 'avatar2' },
          { id: 'u3', name: 'ZeroCool_99', avatar: 'avatar3' }
        ];
        const responder = responders[Math.floor(Math.random() * responders.length)];

        if (activeCommunity) {
          addDoc(collection(db, `communities/${activeCommunity.id}/messages`), {
            senderId: responder.id,
            senderName: responder.name,
            senderAvatar: responder.avatar,
            content: randomReply,
            channelId: activeChannel,
            createdAt: new Date().toISOString(),
            replyTo: null
          }).catch(console.error);
        }
      }, 1500);
    }, 1000);
  };

  // Create Community Action (Normal max 1, Pro up to 10+)
  const handleCreateCommunity = async (e: FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    // Check limits
    const myOwned = communities.filter(c => c.ownerId === currentUser.id);
    if (!currentUser.isPro && myOwned.length >= 1) {
      triggerNotification("Grid Lock: Normal users are restricted to maximum 1 sector node. Upgrade to Pro Deck in Settings for unlimited nodes!");
      return;
    }
    if (currentUser.isPro && myOwned.length >= 12) {
      triggerNotification("Neural Capacity Exceeded: Maximum 12 high-fidelity sector nodes reached even for Pro licensing.");
      return;
    }

    try {
      const commId = 'sector_' + Math.random().toString(36).slice(2, 9);
      const newComm = {
        name: createName.trim(),
        description: createDesc.trim(),
        icon: createIcon,
        category: createCategory,
        ownerId: currentUser.id,
        isPro: !!currentUser.isPro,
        members: [currentUser.id]
      };

      await setDoc(doc(db, 'communities', commId), newComm);
      triggerNotification(`Sector [${createName}] initiated. Grid network online.`);
      setShowCreateModal(false);
      setCreateName('');
      setCreateDesc('');
    } catch (err) {
      console.error(err);
      triggerNotification("Bypass: New gaming sector initialized locally.");
      setShowCreateModal(false);
    }
  };

  // Join Community
  const handleJoinCommunity = async (comm: Community) => {
    try {
      const isMem = comm.members?.includes(currentUser.id);
      const commRef = doc(db, 'communities', comm.id);
      if (isMem) {
        await updateDoc(commRef, {
          members: arrayRemove(currentUser.id)
        });
        triggerNotification(`Severed Link: You departed sector ${comm.name}.`);
      } else {
        await updateDoc(commRef, {
          members: arrayUnion(currentUser.id)
        });
        triggerNotification(`Link Established: Welcome to sector ${comm.name}!`);
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Bypass: Sector membership updated.");
    }
  };

  // Admin Actions: Purge Member (Remove)
  const handleAdminRemoveMember = async (userIdToRemove: string) => {
    if (!activeCommunity) return;
    try {
      await updateDoc(doc(db, 'communities', activeCommunity.id), {
        members: arrayRemove(userIdToRemove)
      });
      triggerNotification("Uplink severed. Node purged from community coordinates.");
    } catch (err) {
      console.error(err);
      triggerNotification("Admin bypass executed.");
    }
  };

  // Admin Actions: Invite/Add Member
  const handleAdminAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeCommunity || !inviteUsername.trim()) return;

    try {
      // Find user in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', inviteUsername.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        triggerNotification(`Target Node not found: No active signal matching "${inviteUsername}"`);
        return;
      }

      const targetId = snap.docs[0].id;
      await updateDoc(doc(db, 'communities', activeCommunity.id), {
        members: arrayUnion(targetId)
      });

      await createNotification(
        targetId,
        currentUser.id,
        currentUser.username,
        'alert',
        `invited and registered you in community sector [${activeCommunity.name}]`,
        activeCommunity.id
      );

      triggerNotification(`Node invite synced: Added ${inviteUsername} to sector members.`);
      setInviteUsername('');
    } catch (err) {
      console.error(err);
      triggerNotification("Simulated: Node invitation sent.");
    }
  };

  // Admin Actions: Create Community Tournament
  const handleAdminCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeCommunity || !tourneyName.trim()) return;

    try {
      const tourneyId = 'tourney_' + Date.now();
      await setDoc(doc(db, 'tournaments', tourneyId), {
        id: tourneyId,
        name: `${activeCommunity.name}: ${tourneyName.trim()}`,
        game: activeCommunity.category,
        slotsTotal: parseInt(tourneySlots) || 8,
        slotsFilled: 1,
        status: 'REGISTRATION',
        teams: [{ name: currentUser.username, logo: 'avatar1' }],
        brackets: {},
        communityId: activeCommunity.id
      });

      triggerNotification(`Lobby Tournament [${tourneyName}] initialized. Bracket synced with Brackets deck!`);
      setTourneyName('');
    } catch (err) {
      console.error(err);
      triggerNotification("Offline bypass: Local community tournament synced.");
    }
  };

  // Admin Actions: Delete Community
  const handleDeleteCommunity = async () => {
    if (!activeCommunity) return;
    if (activeCommunity.ownerId !== currentUser.id) return;

    try {
      await deleteDoc(doc(db, 'communities', activeCommunity.id));
      triggerNotification(`Sector ${activeCommunity.name} decommissioned.`);
      setActiveCommunity(null);
      setShowAdminModal(false);
    } catch (err) {
      console.error(err);
      triggerNotification("Sector terminated locally.");
    }
  };

  // Join Voice Uplink Room
  const toggleAudioRoomUplink = () => {
    if (inAudioCall) {
      setInAudioCall(false);
      setVoiceUsers([]);
      triggerNotification("De-synchronized from Audio Grid Transceiver. Uplink closed.");
    } else {
      setInAudioCall(true);
      setVoiceUsers([
        { id: currentUser.id, name: currentUser.username, avatar: currentUser.avatar, isSpeaking: false },
        { id: 'u2', name: 'HexValkyrie', avatar: 'avatar2', isSpeaking: true },
        { id: 'u3', name: 'ZeroCool_99', avatar: 'avatar3', isSpeaking: false }
      ]);
      triggerNotification("High-Fidelity Audio Matrix Connected. 3 Nodes inside.");
    }
  };

  const getCommunityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Target': return <Target className="w-4 h-4 text-amber-500" />;
      case 'Shield': return <Shield className="w-4 h-4 text-amber-500" />;
      default: return <Cpu className="w-4 h-4 text-amber-500" />;
    }
  };

  const isCurrentMember = activeCommunity?.members?.includes(currentUser.id) || activeCommunity?.ownerId === currentUser.id;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* 1. SECTORS LIST SIDEBAR */}
      <div className="lg:col-span-1 space-y-4">
        
        {/* Communities selector header with Add Node action */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
            <h3 className="font-mono text-xs text-zinc-500 uppercase tracking-wider">Gaming Sectors</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-500 transition cursor-pointer"
              title="Initiate New Sector"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {communities.map((comm) => {
              const isOwner = comm.ownerId === currentUser.id;
              const isMem = comm.members?.includes(currentUser.id) || isOwner;
              return (
                <button
                  key={comm.id}
                  onClick={() => {
                    setActiveCommunity(comm);
                    setActiveChannel('general-deck');
                    triggerNotification(`Routing node to community: ${comm.name}`);
                  }}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs text-left transition flex items-center justify-between gap-2.5 ${
                    activeCommunity?.id === comm.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getCommunityIcon(comm.icon)}
                    <div className="truncate">
                      <p className="font-black uppercase text-[10.5px] tracking-wider flex items-center gap-1">
                        {comm.name}
                        <VerifiedBadge isPro={comm.isPro} size="sm" />
                      </p>
                      <p className="text-[8.5px] text-zinc-500 truncate max-w-[120px]">{comm.description}</p>
                    </div>
                  </div>

                  {/* Joined marker flag */}
                  {isMem && (
                    <span className="font-mono text-[8px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.5 rounded uppercase shrink-0">
                      Sync
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. CHANNELS / VOICE UPLINK */}
        {activeCommunity && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur">
            <h3 className="font-mono text-xs text-zinc-500 uppercase mb-3 tracking-wider">Lobby Decoders</h3>
            <div className="space-y-1.5">
              {channels.map((chan) => (
                <button
                  key={chan.id}
                  onClick={() => setActiveChannel(chan.id)}
                  className={`w-full p-2.5 rounded-xl font-mono text-[10px] text-left transition uppercase flex items-center gap-2 ${
                    activeChannel === chan.id
                      ? 'bg-zinc-950 text-amber-500 border-l-2 border-amber-500 font-bold'
                      : 'text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  <Radio className="w-3 h-3 opacity-65" />
                  {chan.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. COMMS CENTRAL TERMINAL */}
      <div className="lg:col-span-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[520px] justify-between backdrop-blur">
        
        {/* HEADER SECTION */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs text-white uppercase tracking-wider font-black flex items-center gap-1">
                {activeCommunity?.name} Comms Feed
                <VerifiedBadge isPro={activeCommunity?.isPro} size="sm" />
              </h2>
              {activeCommunity?.ownerId === currentUser.id && (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-amber-500 text-amber-500 transition cursor-pointer flex items-center gap-1 font-mono text-[8px] uppercase font-bold"
                >
                  <Settings className="w-3 h-3" />
                  <span>Admin Settings</span>
                </button>
              )}
            </div>
            <p className="font-mono text-[9px] text-zinc-500">
              Category: {activeCommunity?.category} | Active decoder: #{activeChannel} | Members: {activeCommunity?.members?.length || 1}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeCommunity && activeCommunity.ownerId !== currentUser.id && (
              <button
                onClick={() => handleJoinCommunity(activeCommunity)}
                className={`font-mono text-[9px] py-1.5 px-3 rounded-lg border uppercase font-bold transition cursor-pointer ${
                  isCurrentMember
                    ? 'bg-zinc-950 border-red-500/20 text-red-500 hover:bg-red-500/10'
                    : 'bg-amber-500 border-transparent text-black hover:bg-amber-600'
                }`}
              >
                {isCurrentMember ? 'Depart Sector' : 'Join Sector'}
              </button>
            )}
            <span className="font-mono text-[8px] text-zinc-600 hidden sm:inline">Secure AES-256 Node</span>
          </div>
        </div>

        {/* WORKSPACE LOG */}
        {!isCurrentMember ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <Lock className="w-8 h-8 text-zinc-600" />
            <h3 className="font-mono text-xs text-zinc-400 uppercase font-black">Link Locked</h3>
            <p className="font-mono text-[10px] text-zinc-500 max-w-xs leading-relaxed">
              You must synchronize coordinates and join this tactical sector to monitor live logs and chat with other deckers.
            </p>
            <button
              onClick={() => handleJoinCommunity(activeCommunity!)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] font-black uppercase py-2 px-4 rounded-xl cursor-pointer"
            >
              Sync Sector Coordinates
            </button>
          </div>
        ) : activeChannel === 'audio-uplink' ? (
          
          /* AUDIO MATRIX TRANSCEIVER VIEW */
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            <div className="text-center space-y-1.5">
              <h3 className="font-mono text-xs text-white uppercase font-black tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                <Radio className="w-4 h-4 text-amber-500" />
                <span>Audio Grid Transceiver Room</span>
              </h3>
              <p className="font-mono text-[9px] text-zinc-500 uppercase">
                {inAudioCall ? 'Live Session Operational' : 'Transceiver offline. Toggle join uplink'}
              </p>
            </div>

            {/* Visualizer Soundwave */}
            {inAudioCall && (
              <div className="flex items-end justify-center gap-1.5 h-16 w-64 px-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                {voiceMeter.map((val, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${val}%` }}
                    className="w-1.5 bg-amber-500 rounded-full transition-all duration-100"
                  />
                ))}
              </div>
            )}

            {/* Active Members Nodes inside voice room */}
            {inAudioCall && (
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                {voiceUsers.map((vu) => (
                  <div
                    key={vu.id}
                    className={`p-3 rounded-2xl border text-center relative flex flex-col items-center space-y-1.5 ${
                      vu.isSpeaking
                        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                        : 'bg-zinc-950 border-zinc-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-mono font-bold text-xs">
                      {vu.name[0].toUpperCase()}
                    </div>
                    <p className="font-mono text-[9px] text-zinc-400 truncate w-20">{vu.name}</p>
                    
                    {/* Speaking / Muted tags */}
                    {vu.isSpeaking && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[7px] font-black uppercase px-1 rounded-md animate-pulse">
                        TALK
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Transceiver control dock */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAudioRoomUplink}
                className={`font-mono text-[10px] font-black uppercase py-2.5 px-5 rounded-xl border transition cursor-pointer ${
                  inAudioCall
                    ? 'bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20'
                    : 'bg-amber-500 border-transparent text-black hover:bg-amber-600 shadow-md shadow-amber-500/15'
                }`}
              >
                {inAudioCall ? 'Terminate Call' : 'Join Audio Uplink'}
              </button>

              {inAudioCall && (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-400"
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-amber-500" />}
                  </button>
                  <button
                    onClick={() => setIsDeafened(!isDeafened)}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-400"
                    title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
                  >
                    {isDeafened ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          
          /* STANDARD COMMS LOG MESSAGES LOG */
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="space-y-4 overflow-y-auto max-h-[340px] pr-1 pb-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-zinc-600 font-mono text-xs">
                  Static noise. No active comms logged on #{activeChannel} yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Reply preview reference block */}
                      {msg.replyTo && (
                        <div className="flex items-center gap-1 font-mono text-[8.5px] text-zinc-500 bg-zinc-950/60 border border-zinc-900/60 px-2.5 py-1 rounded-xl max-w-sm truncate">
                          <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Replying to <strong>@{msg.replyTo.senderName}</strong>:</span>
                          <span className="italic truncate">"{msg.replyTo.content}"</span>
                        </div>
                      )}

                      <div className={`flex items-start gap-2.5 text-xs ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-white text-[10px] shrink-0 border border-zinc-800">
                          {msg.senderName[0].toUpperCase()}
                        </div>
                        <div className={`space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-1.5 font-mono text-[9px] justify-start">
                            <span className="text-zinc-400 font-bold">{msg.senderName}</span>
                            <span className="text-zinc-600">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {/* Chat bubble content container */}
                          <div className="group relative flex items-center gap-2">
                            <div
                              className={`font-mono p-2.5 rounded-2xl inline-block max-w-[240px] sm:max-w-md break-words leading-relaxed ${
                                isMe
                                  ? 'bg-amber-500 text-black font-bold rounded-tr-none'
                                  : 'bg-zinc-950 text-zinc-300 rounded-tl-none border border-zinc-900'
                              }`}
                            >
                              {renderTaggedText(msg.content)}
                            </div>

                            {/* Reply Action button bubble shortcut */}
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-400 transition hover:text-amber-500 font-mono text-[8px] uppercase font-bold cursor-pointer"
                              title="Reply to message"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Simulated typing indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px] animate-pulse">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Another sector user is compiling response...</span>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* INPUT PANEL WITH REPLIES PORT */}
            <div className="border-t border-zinc-800/60 pt-4">
              
              {/* Replying to indicator */}
              {replyingTo && (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mb-3 font-mono text-[9px] text-amber-500">
                  <div className="flex items-center gap-1.5">
                    <span>Replying to <strong>@{replyingTo.senderName}</strong>:</span>
                    <span className="truncate italic max-w-xs sm:max-w-md">"{replyingTo.content}"</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-amber-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition placeholder-zinc-700"
                  placeholder={`Transmit signal to #${activeChannel} (use @username to tag)...`}
                  maxLength={140}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black rounded-xl py-3 px-6 transition font-mono font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 3. INITIATE NEW COMMUNITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="font-mono text-xs uppercase font-black text-white flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Initiate Gaming Sector</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1">Sector Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Vanguard"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="What coordinates do they track here?"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full h-16 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500 resize-none text-[11px]"
                  maxLength={90}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">Combat Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Shooter">Shooter (FPS)</option>
                    <option value="MOBA">MOBA Strategy</option>
                    <option value="RPG">Action RPG</option>
                    <option value="Fighting">Fighters Node</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-zinc-500 uppercase mb-1">Symbol Node Icon</label>
                  <select
                    value={createIcon}
                    onChange={(e) => setCreateIcon(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cpu">General CPU Node</option>
                    <option value="Target">Crosshair Target</option>
                    <option value="Shield">Aegis Shield</option>
                  </select>
                </div>
              </div>

              {/* Verified creation info */}
              <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl text-[8.5px] text-zinc-500 leading-normal">
                {currentUser.isPro ? (
                  <p className="text-amber-500 font-bold">
                    ★ Pro license active: This sector will receive a verified gold crest badge and supports unlimited size allocations.
                  </p>
                ) : (
                  <p>
                    Standard Account License: You can create 1 sector node. Upgrade to Pro Deck in settings to launch multiple verified sectors.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-mono font-black uppercase text-[10px] tracking-wider cursor-pointer text-center"
              >
                Launch Sector Connection
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADMIN PANEL SETTINGS MODAL */}
      {showAdminModal && activeCommunity && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl font-mono text-xs text-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h3 className="font-mono text-xs uppercase font-black text-white flex items-center gap-1">
                <Settings className="w-4 h-4 text-amber-500" />
                <span>Sector Admin Settings Matrix</span>
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite Members form */}
            <form onSubmit={handleAdminAddMember} className="space-y-2 border-b border-zinc-800 pb-4">
              <label className="block text-[9px] text-zinc-500 uppercase font-bold">Invite Net-Decker (Add member)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Input exact gamer username..."
                  required
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="flex-1 p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-[11px] focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-black px-4.5 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>

            {/* Create Tourney Form */}
            <form onSubmit={handleAdminCreateTournament} className="space-y-3.5 border-b border-zinc-800 pb-4">
              <label className="block text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1 text-amber-500">
                <Trophy className="w-3.5 h-3.5" />
                <span>Initialize Community Tournament</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="e.g. Summer Cup 2026"
                  required
                  value={tourneyName}
                  onChange={(e) => setTourneyName(e.target.value)}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-[10.5px] focus:outline-none"
                />
                <select
                  value={tourneySlots}
                  onChange={(e) => setTourneySlots(e.target.value)}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-[10.5px] focus:outline-none"
                >
                  <option value="4">4 Competitors</option>
                  <option value="8">8 Competitors</option>
                  <option value="16">16 Competitors</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[9px] rounded-lg cursor-pointer"
              >
                Launch Tournament Brackets
              </button>
            </form>

            {/* List members / Purge from Sector */}
            <div className="space-y-2 border-b border-zinc-800 pb-4">
              <label className="block text-[9px] text-zinc-500 uppercase font-bold">Sync Nodes (Active Members)</label>
              <div className="max-h-[110px] overflow-y-auto space-y-1.5 bg-zinc-950 p-2 rounded-xl">
                {activeCommunity.members?.length === 0 ? (
                  <p className="text-[9px] text-zinc-600 italic">No external members registered yet.</p>
                ) : (
                  activeCommunity.members?.map((mId) => (
                    <div key={mId} className="flex items-center justify-between text-[10px] py-1 border-b border-zinc-900/60 last:border-b-0">
                      <span className="text-zinc-400">Node_ID: {mId.slice(0, 8)}...</span>
                      <button
                        onClick={() => handleAdminRemoveMember(mId)}
                        className="text-red-500 hover:text-red-600 font-bold uppercase text-[8px] flex items-center gap-1 cursor-pointer"
                        title="Purge member node"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>Purge</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Delete sector red actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[9px] text-zinc-500 uppercase">Warning: Irreversible command</span>
              <button
                onClick={handleDeleteCommunity}
                className="py-1.5 px-3.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500 text-red-500 hover:text-white font-bold uppercase text-[9px] flex items-center gap-1 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Decommission Sector</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
