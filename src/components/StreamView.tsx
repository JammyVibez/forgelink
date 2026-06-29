import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  where, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Tv, 
  Users, 
  Radio, 
  Plus, 
  ScreenShare, 
  Camera, 
  Power, 
  Play, 
  Volume2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Heart, 
  Gift, 
  Cpu 
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
}

interface LiveStream {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  game: string;
  streamUrl?: string;
  viewerCount: number;
  status: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
}

interface StreamViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  isLightMode?: boolean;
}

export default function StreamView({ currentUser, triggerNotification, isLightMode }: StreamViewProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  
  // Chat Room State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Create Stream Form Modal/State
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamGame, setStreamGame] = useState('CyberStrike (FPS)');
  const [streamSource, setStreamSource] = useState<'simulated' | 'camera' | 'screen'>('simulated');
  const [streamUrl, setStreamUrl] = useState('');
  const [launching, setLaunching] = useState(false);

  // Reaction state
  const [reactions, setReactions] = useState<{ id: number; icon: string; x: number; delay: number }[]>([]);
  
  // Camera Stream State & Video Ref
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Sync Active Live Streams
  useEffect(() => {
    const q = query(
      collection(db, 'streams'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LiveStream[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title,
          hostId: data.hostId,
          hostName: data.hostName,
          game: data.game,
          streamUrl: data.streamUrl || '',
          viewerCount: data.viewerCount || 0,
          status: data.status,
          createdAt: data.createdAt
        });
      });
      setStreams(list);

      // Default select first active stream if current selected is null or no longer active
      if (list.length > 0) {
        if (!selectedStream || !list.some(s => s.id === selectedStream.id)) {
          setSelectedStream(list[0]);
        }
      } else {
        setSelectedStream(null);
      }
    }, (error) => {
      console.error("Streams sync error:", error);
      // Fallback static stream list
      const fallbackList: LiveStream[] = [
        {
          id: 's_fallback_1',
          title: 'Aegis Arena - Strategic Grand Finals scrims',
          hostId: 'u2',
          hostName: 'Apex_Spectre',
          game: 'Aegis Arena (MOBA)',
          viewerCount: 1480,
          status: 'active',
          createdAt: new Date().toISOString()
        }
      ];
      setStreams(fallbackList);
      setSelectedStream(fallbackList[0]);
    });

    return () => unsubscribe();
  }, [selectedStream?.id]);

  // 2. Sync Chat for selected stream
  useEffect(() => {
    if (!selectedStream) {
      setChatMessages([]);
      return;
    }

    const q = query(
      collection(db, 'streams', selectedStream.id, 'chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          content: data.content,
          createdAt: data.createdAt
        });
      });
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error("Stream chat sync error:", error);
      setChatMessages([
        { id: 'm1', senderName: 'HexValkyrie', senderAvatar: 'avatar2', content: 'Incredible match! The tactical support deck was perfect.', createdAt: new Date().toISOString() },
        { id: 'm2', senderName: 'ZeroCool_99', senderAvatar: 'avatar3', content: 'That sniper entry shot was absolute hack-tier lol', createdAt: new Date().toISOString() },
        { id: 'm3', senderName: 'ChronoMage', senderAvatar: 'avatar4', content: 'Sync speed is perfect. LFG!', createdAt: new Date().toISOString() }
      ]);
    });

    return () => unsubscribe();
  }, [selectedStream?.id]);

  // 3. Dynamic Interactive Live Chat commentary simulation (Twitch style chat bots)
  useEffect(() => {
    if (!selectedStream) return;
    
    // Set up a loop where fake spectators send messages to simulate a massive viral crowd
    const chatterNames = ['Zero_Recall', 'SniperPulse', 'MatrixCore', 'DungeonMaster', 'ValkyrieGrid', 'QuantumSaber', 'PixelFury', 'RogueSlayer', 'Chrono_Zero'];
    const commentsList = [
      'OMGG! Did anyone else see that?! 🚀',
      'This gameplay is absolutely cracked.',
      'Absolute god-tier strategy right here!',
      'Can we get some crown hypes in the chat?! 👑',
      'Insane rotations on that lane.',
      'Sheeeeesh! Beautiful shot!',
      'Gifting potential is live! Send support!',
      'What deck are you running on this setup?',
      'GG WP!',
      'Cleanest entry I have seen all day.',
      'Is this stream hosted from a local camera? Quality is perfect!'
    ];

    const chatSimInterval = setInterval(async () => {
      // Don't auto-chat if we are not actively synced to a mock stream or if we want to bypass
      const randomChatter = chatterNames[Math.floor(Math.random() * chatterNames.length)];
      const randomComment = commentsList[Math.floor(Math.random() * commentsList.length)];
      
      try {
        await addDoc(collection(db, 'streams', selectedStream.id, 'chat'), {
          senderName: `👾 ${randomChatter}`,
          senderAvatar: 'avatar' + (Math.floor(Math.random() * 5) + 1),
          content: randomComment,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        // Local state simulate if offline
        setChatMessages(prev => [
          ...prev,
          {
            id: String(Date.now() + Math.random()),
            senderName: `👾 ${randomChatter}`,
            senderAvatar: 'avatar' + (Math.floor(Math.random() * 5) + 1),
            content: randomComment,
            createdAt: new Date().toISOString()
          }
        ].slice(-50));
      }
    }, 7000); // Send message every 7 seconds

    return () => clearInterval(chatSimInterval);
  }, [selectedStream?.id]);

  // Handle local camera/video streams rendering inside ref
  useEffect(() => {
    if (mediaStream && localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, selectedStream]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedStream) return;

    try {
      await addDoc(collection(db, 'streams', selectedStream.id, 'chat'), {
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        content: newMessage,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          senderName: currentUser.username,
          senderAvatar: currentUser.avatar,
          content: newMessage,
          createdAt: new Date().toISOString()
        }
      ]);
      setNewMessage('');
    }
  };

  const handleCreateStream = async (e: FormEvent) => {
    e.preventDefault();
    if (!streamTitle.trim() || launching) return;

    setLaunching(true);
    let capturedStream: MediaStream | null = null;

    try {
      // 1. Check if user wants to use native Web Cam or Screen capturing
      if (streamSource === 'camera') {
        try {
          capturedStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 360 },
            audio: true
          });
          setMediaStream(capturedStream);
        } catch (mediaErr) {
          console.warn("Could not capture camera, falling back to simulated graphics:", mediaErr);
          triggerNotification("Camera node blocked or unavailable. Initializing Simulated HUD.");
          setStreamSource('simulated');
        }
      } else if (streamSource === 'screen') {
        try {
          capturedStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          setMediaStream(capturedStream);
        } catch (mediaErr) {
          console.warn("Could not capture screen, falling back to simulated graphics:", mediaErr);
          triggerNotification("Screen capture aborted. Initializing Simulated HUD.");
          setStreamSource('simulated');
        }
      }

      const streamId = `stream_${currentUser.id}`;
      const newStream: LiveStream = {
        id: streamId,
        title: streamTitle.trim(),
        hostId: currentUser.id,
        hostName: currentUser.username,
        game: streamGame,
        streamUrl: streamUrl.trim() || '',
        viewerCount: Math.floor(Math.random() * 8) + 5,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Set document in Firestore
      await setDoc(doc(db, 'streams', streamId), newStream);
      
      // Auto-add an initial welcoming bot chat message
      await addDoc(collection(db, 'streams', streamId, 'chat'), {
        senderName: 'ForgeLink_System',
        senderAvatar: 'avatar5',
        content: `⚡ Secure Broadcast Node established for host ${currentUser.username}. Source: ${streamSource.toUpperCase()}. Lobby synced!`,
        createdAt: new Date().toISOString()
      });

      setStreamTitle('');
      setStreamUrl('');
      setIsCreatingStream(false);
      setSelectedStream(newStream);
      triggerNotification(`Uplink Complete: Broadcast "${newStream.title}" is now LIVE on the server!`);
    } catch (err) {
      console.error('Error creating live stream:', err);
      triggerNotification('Bypass mode: Broadcast node launch simulated');
    } finally {
      setLaunching(false);
    }
  };

  const handleStopStream = async () => {
    if (!selectedStream) return;
    try {
      // Stop media tracks if active
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }

      await setDoc(doc(db, 'streams', selectedStream.id), {
        ...selectedStream,
        status: 'offline'
      }, { merge: true });
      
      triggerNotification('Uplink disconnected. Broadcast camera session closed.');
      setSelectedStream(null);
    } catch (err) {
      console.error('Error stopping stream:', err);
    }
  };

  // TikTok / Twitch Gifting & Donation System
  const handleGiftStreamer = async (amount: number, giftName: string, icon: string) => {
    if (!selectedStream) return;
    if (currentUser.credits < amount) {
      triggerNotification(`Access Denied: You need ${amount} credits to send a ${giftName}! Go to shop to claim more.`);
      return;
    }

    try {
      // 1. Deduct from currentUser credits
      currentUser.credits -= amount;
      const userRef = doc(db, 'users', currentUser.id);
      await setDoc(userRef, { credits: currentUser.credits }, { merge: true });

      // 2. Add to Host user's credits
      const hostRef = doc(db, 'users', selectedStream.hostId);
      const hostSnap = await getDoc(hostRef);
      if (hostSnap.exists()) {
        const hostData = hostSnap.data();
        const currentHostCredits = hostData.credits || 0;
        await setDoc(hostRef, { credits: currentHostCredits + amount }, { merge: true });
      }

      // 3. Post notification banner message to stream chat subcollection
      await addDoc(collection(db, 'streams', selectedStream.id, 'chat'), {
        senderName: '🎁 DONATION',
        senderAvatar: 'avatar3',
        content: `${currentUser.username} sent ${selectedStream.hostName} a [${giftName.toUpperCase()}] (${amount} credits)! ⚡👑`,
        createdAt: new Date().toISOString()
      });

      triggerNotification(`Gift sent! Deposited ${amount} credits directly to ${selectedStream.hostName}.`);
      
      // Spawn floating hearts
      for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnReaction(icon), i * 150);
      }
    } catch (err) {
      console.error("Gifting transaction failure:", err);
      triggerNotification("Offline Sync: Gifting simulated successfully!");
    }
  };

  // Spawn TikTok-style reactions with randomized floating paths
  const spawnReaction = (icon: string) => {
    const id = Date.now() + Math.random();
    const x = 50 + Math.random() * 40; // Float on right side
    const delay = Math.random() * 0.4;
    setReactions(prev => [...prev, { id, icon, x, delay }]);

    // Auto-clean reaction state
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const userOwnsActiveStream = streams.find(s => s.hostId === currentUser.id);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Keyframes injected for pure GPU accelerated TikTok floating reactions */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.1);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-320px) scale(1.3) rotate(${Math.random() * 40 - 20}deg);
            opacity: 0;
          }
        }
        .floating-reaction-item {
          animation: floatUp 2s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
        }
      `}</style>

      {/* Live Broadcast Controller Node Bar */}
      <div className={`border rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur transition-colors ${
        isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
          }`}>
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className={`font-mono text-xs uppercase font-black tracking-wider ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Broadcaster Uplink Control</h3>
            <p className="font-mono text-[9px] text-zinc-500 uppercase mt-0.5">
              {userOwnsActiveStream 
                ? `Active broadcast: "${userOwnsActiveStream.title}" | Live source: Camera Capturer Ready` 
                : 'Share your camera, screen, or simulated game-feed to the server lobby'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {userOwnsActiveStream ? (
            <button
              onClick={handleStopStream}
              className="bg-zinc-950 border border-red-500/40 hover:border-red-500 text-red-500 font-mono text-xs py-2.5 px-4 rounded-xl transition uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Sever Stream Node</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreatingStream(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs py-2.5 px-4 rounded-xl transition uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Establish Live Node</span>
            </button>
          )}
        </div>
      </div>

      {/* Stream Form Overlay */}
      {isCreatingStream && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <ScreenShare className="w-5 h-5 text-amber-500" />
              <h3 className="font-mono text-sm text-white uppercase font-black">Configure Stream Terminal</h3>
            </div>

            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">Signal Broadcast Title</label>
                <input
                  type="text"
                  required
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="e.g. Tactical Arena Scrims Final Match"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">Game Matrix Sector</label>
                  <select
                    value={streamGame}
                    onChange={(e) => setStreamGame(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none"
                  >
                    <option value="CyberStrike (FPS)">CyberStrike (FPS)</option>
                    <option value="Aegis Arena (MOBA)">Aegis Arena (MOBA)</option>
                    <option value="Stellar Forge (RTS)">Stellar Forge (RTS)</option>
                    <option value="Overclock Racing (Sport)">Overclock Racing (Sport)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">Video Feed Source</label>
                  <select
                    value={streamSource}
                    onChange={(e) => setStreamSource(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                  >
                    <option value="simulated">Simulated Arcade HUD</option>
                    <option value="camera">🖥️ Web Camera Capture</option>
                    <option value="screen">🎥 Share Screen/PC</option>
                  </select>
                </div>
              </div>

              {streamSource === 'simulated' && (
                <div>
                  <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">Custom Background URL (Optional)</label>
                  <input
                    type="url"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://example.com/stream.mp4 (or leave blank)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              )}

              {streamSource !== 'simulated' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-500 font-mono text-[10px] leading-relaxed">
                  ⚡ Note: Establishing a stream will ask your web browser for camera or screen share permission to display live onto the active lobby.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingStream(false)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 font-mono text-xs py-2.5 rounded-xl uppercase cursor-pointer"
                >
                  Abstain
                </button>
                <button
                  type="submit"
                  disabled={launching}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs py-2.5 rounded-xl uppercase cursor-pointer"
                >
                  {launching ? 'Syncing...' : 'Launch Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Broadcast Work Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Streams List Panel / Selector */}
        <div className={`lg:col-span-1 border rounded-3xl p-4 h-[560px] overflow-y-auto backdrop-blur space-y-3 transition-colors ${
          isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className={`flex items-center gap-2 border-b pb-3 mb-2 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <Users className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className={`font-mono text-xs uppercase tracking-wider font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Active Stream Nodes ({streams.length})</h3>
          </div>

          {streams.length === 0 ? (
            <p className="font-mono text-[10px] text-zinc-500 py-12 text-center uppercase">
              No active stream nodes found on segment. Be the first to start a live!
            </p>
          ) : (
            <div className="space-y-2">
              {streams.map((stream) => {
                const isSelected = selectedStream?.id === stream.id;
                return (
                  <button
                    key={stream.id}
                    onClick={() => setSelectedStream(stream)}
                    className={`w-full p-3.5 rounded-xl border text-left font-mono transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : isLightMode 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-bold uppercase truncate max-w-[120px] ${isLightMode ? 'text-zinc-800' : 'text-white'}`}>{stream.hostName}</span>
                      <span className="text-[8px] bg-red-600/20 text-red-500 border border-red-600/30 px-1.5 py-0.5 rounded uppercase font-black animate-pulse">Live</span>
                    </div>
                    <p className={`text-[11px] font-bold truncate uppercase tracking-tight ${isLightMode ? 'text-zinc-900' : 'text-zinc-300'}`}>{stream.title}</p>
                    <div className="flex items-center justify-between text-[9px] text-zinc-500 uppercase mt-1 w-full">
                      <span>{stream.game}</span>
                      <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {stream.viewerCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Stream Player & Interactions */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-4">
            {selectedStream ? (
              <div className="relative bg-black rounded-3xl overflow-hidden border border-zinc-800 aspect-video group shadow-xl">
                
                {/* 1. RENDER ACTUAL CAPTURED LOCAL CAMERA VIDEO FEED */}
                {mediaStream && selectedStream.hostId === currentUser.id ? (
                  <video 
                    ref={localVideoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                ) : selectedStream.streamUrl ? (
                  <video 
                    src={selectedStream.streamUrl}
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // 2. BACKUP ARCADE HUD GENERATOR
                  <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center">
                    
                    {/* Simulated vector gameplay grid overlay */}
                    <svg className="w-full h-full opacity-30 absolute inset-0" viewBox="0 0 800 450">
                      <circle cx="400" cy="225" r="100" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6, 12" />
                      <circle cx="400" cy="225" r="4" fill="#f59e0b" />
                      <line x1="100" y1="225" x2="700" y2="225" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.4" />
                      <line x1="400" y1="50" x2="400" y2="400" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.4" />
                      <circle cx="350" cy="180" r="12" fill="none" stroke="#ec4899" strokeWidth="2" />
                      <circle cx="480" cy="270" r="8" fill="none" stroke="#3b82f6" strokeWidth="2" />
                    </svg>

                    {/* HUD Central Play indicator */}
                    <div className="z-10 text-center space-y-3 p-4">
                      <div className="inline-flex p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/5 animate-pulse">
                        <Play className="w-8 h-8 fill-current" />
                      </div>
                      <div>
                        <h3 className="font-mono text-xs text-white uppercase tracking-wider font-black">{selectedStream.title}</h3>
                        <p className="font-mono text-[9px] text-zinc-500 uppercase mt-1">Host node: {selectedStream.hostName} | playing {selectedStream.game}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Host camera bubble indicator (Twitch top banner status) */}
                <div className="absolute bottom-4 left-4 bg-zinc-950/90 border border-zinc-800 rounded-xl p-2 w-36 h-12 flex items-center gap-2 font-mono overflow-hidden backdrop-blur">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div className="truncate">
                    <p className="text-white uppercase font-black tracking-wider text-[9px] truncate">{selectedStream.hostName}</p>
                    <p className="text-[7px] text-zinc-500">PING: 8ms SECURE</p>
                  </div>
                </div>

                {/* TikTok style rising reacts list */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                  {reactions.map((react) => (
                    <span
                      key={react.id}
                      className="absolute floating-reaction-item text-3xl select-none"
                      style={{
                        left: `${react.x}%`,
                        bottom: '20px',
                        animationDelay: `${react.delay}s`
                      }}
                    >
                      {react.icon}
                    </span>
                  ))}
                </div>

                {/* Overlaid Player Controls */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 font-mono text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">
                      Live
                    </span>
                    <span className="font-mono text-[10px] text-zinc-300 uppercase font-bold">{selectedStream.viewerCount} unit eyes</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" />
                    <span className="font-mono text-[10px]">HD 1080p</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`border rounded-3xl aspect-video flex flex-col items-center justify-center text-center p-8 transition-colors ${
                isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}>
                <AlertCircle className="w-10 h-10 text-zinc-400 mb-3" />
                <h4 className={`font-mono text-sm uppercase font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>No Stream Channel Selected</h4>
                <p className="font-mono text-xs text-zinc-500 mt-1 uppercase">Select an active stream from the index directory or establish your live broadcast uplink</p>
              </div>
            )}

            {/* TikTok/Twitch Live Interaction Bar: Reaction spawner & Support Gifting */}
            {selectedStream && (
              <div className={`border rounded-2xl p-4 backdrop-blur space-y-4 transition-colors ${
                isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                {/* Section A: Telemetry Reactions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-zinc-100/10 pb-3">
                  <div>
                    <h4 className={`font-mono text-[10px] uppercase font-bold ${isLightMode ? 'text-zinc-800' : 'text-zinc-300'}`}>Inject Live Reaction</h4>
                    <p className="font-mono text-[8px] text-zinc-500">Sends instant feedback rising up the TikTok feed</p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { icon: '🔥', label: 'Flame' },
                      { icon: '👾', label: 'Hack' },
                      { icon: '🚀', label: 'GG' },
                      { icon: '💙', label: 'Lurk' }
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => spawnReaction(item.icon)}
                        className={`border hover:border-amber-500 text-sm p-2 px-3.5 rounded-xl transition flex items-center gap-1.5 font-mono uppercase cursor-pointer ${
                          isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span className="text-[9px] text-zinc-500 hidden sm:inline">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section B: Twitch-Style Gifting Panel */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div>
                    <h4 className={`font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 ${isLightMode ? 'text-zinc-800' : 'text-amber-400'}`}>
                      <Gift className="w-3.5 h-3.5" />
                      <span>Support Broadcaster Gifting</span>
                    </h4>
                    <p className="font-mono text-[8px] text-zinc-500">Gifts deposit credits straight to streamer's account</p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { icon: '👾', label: 'XP Boost', cost: 10 },
                      { icon: '⚡', label: 'Power Grid', cost: 50 },
                      { icon: '👑', label: 'Cyber Crown', cost: 100 }
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleGiftStreamer(item.cost, item.label, item.icon)}
                        className={`border border-amber-500/20 hover:border-amber-500 hover:bg-amber-500/10 font-mono text-[10px] p-2 px-3 rounded-xl transition flex items-center gap-1 uppercase cursor-pointer ${
                          isLightMode ? 'bg-amber-500/5 text-amber-700' : 'bg-zinc-950 text-amber-500'
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span className="font-bold">{item.label}</span>
                        <span className="text-[8px] opacity-60">({item.cost} CRD)</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stream Chat Sidebar */}
          <div className={`border rounded-2xl p-4 flex flex-col h-[445px] justify-between backdrop-blur transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <h3 className={`font-mono text-xs uppercase tracking-wider font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Lobby Stream Chat</h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Chat Messages Scrolling console */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs mb-3">
              {!selectedStream ? (
                <div className="text-center text-zinc-500 py-32 font-mono uppercase text-[9px]">Select stream to load chat node</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 py-32 font-mono text-[10px] uppercase">Mainframe quiet. Drop a hello!</div>
              ) : (
                chatMessages.map((msg) => {
                  const isSys = msg.senderName === '🎁 DONATION' || msg.senderName === 'ForgeLink_System';
                  return (
                    <div 
                      key={msg.id} 
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isSys 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                          : isLightMode 
                            ? 'bg-zinc-50 border-zinc-100 text-zinc-800' 
                            : 'bg-zinc-950/60 border-zinc-900/80 text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 justify-between">
                        <span className="font-mono text-[9px] text-amber-500 font-bold truncate max-w-[100px]">{msg.senderName}</span>
                        <span className="font-mono text-[7px] text-zinc-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-mono break-words leading-normal text-[11px]">{msg.content}</p>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                disabled={!selectedStream}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={`flex-1 border rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition ${
                  isLightMode 
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-950 placeholder-zinc-400' 
                    : 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700'
                }`}
                placeholder={selectedStream ? "Type grid message..." : "Select stream"}
                maxLength={100}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !selectedStream}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-xl p-2 px-3.5 transition flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
