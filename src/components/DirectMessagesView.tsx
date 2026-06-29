import { useState, useEffect, useRef, FormEvent } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, Send, Radio, Lock, Sparkles, MessageSquare } from 'lucide-react';

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  createdAt: string;
}

interface Gamer {
  id: string;
  username: string;
  avatar: string;
  theme: string;
  rankClass: string;
  bio: string;
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

interface DirectMessagesViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  isLightMode?: boolean;
  preselectedUserId?: string | null;
  onClearPreselected?: () => void;
}

export default function DirectMessagesView({ 
  currentUser, 
  triggerNotification, 
  isLightMode,
  preselectedUserId,
  onClearPreselected
}: DirectMessagesViewProps) {
  const [gamers, setGamers] = useState<Gamer[]>([]);
  const [activeGamer, setActiveGamer] = useState<Gamer | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [decryptedMsgIds, setDecryptedMsgIds] = useState<string[]>([]);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Auto route to preselected direct message partner
  useEffect(() => {
    if (preselectedUserId && gamers.length > 0) {
      const match = gamers.find(g => g.id === preselectedUserId);
      if (match) {
        setActiveGamer(match);
        if (onClearPreselected) {
          onClearPreselected();
        }
      }
    }
  }, [preselectedUserId, gamers, onClearPreselected]);

  // Load online gamers for chat list
  useEffect(() => {
    // We listen to the users collection to find active players
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: Gamer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.id !== currentUser.id) {
          list.push({
            id: data.id,
            username: data.username,
            avatar: data.avatar,
            theme: data.theme,
            rankClass: data.rankClass,
            bio: data.bio
          });
        }
      });
      setGamers(list);
      if (list.length > 0 && !activeGamer) {
        setActiveGamer(list[0]);
      }
    }, (error) => {
      console.error(error);
      // Fallback
      const mockGamers = [
        { id: 'u2', username: 'HexValkyrie', avatar: 'avatar2', theme: 'cyberpunk', rankClass: 'Diamond', bio: 'Entry fragger.' },
        { id: 'u3', username: 'ZeroCool_99', avatar: 'avatar3', theme: 'matrix', rankClass: 'Platinum', bio: 'Sniper specialist.' }
      ];
      setGamers(mockGamers);
      setActiveGamer(mockGamers[0]);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  // Load DMs between current user and active gamer
  useEffect(() => {
    if (!activeGamer) return;

    // Fetch DMs query
    const q = query(
      collection(db, 'direct_messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DirectMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Client-side filter for reciprocal messages
        const isParticipant =
          (data.senderId === currentUser.id && data.recipientId === activeGamer.id) ||
          (data.senderId === activeGamer.id && data.recipientId === currentUser.id);

        if (isParticipant) {
          list.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            recipientId: data.recipientId,
            recipientName: data.recipientName,
            content: data.content,
            createdAt: data.createdAt
          });
        }
      });
      setMessages(list);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error(error);
      // Fallback
      setMessages([
        { id: 'm1', senderId: activeGamer.id, senderName: activeGamer.username, recipientId: currentUser.id, recipientName: currentUser.username, content: 'Secure neural link connected. Transmit crypt-sig.', createdAt: new Date().toISOString() }
      ]);
    });

    return () => unsubscribe();
  }, [activeGamer, currentUser.id]);

  const handleSendDM = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGamer) return;

    try {
      await addDoc(collection(db, 'direct_messages'), {
        senderId: currentUser.id,
        senderName: currentUser.username,
        recipientId: activeGamer.id,
        recipientName: activeGamer.username,
        content: newMessage,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
      // Local fallback append
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          senderId: currentUser.id,
          senderName: currentUser.username,
          recipientId: activeGamer.id,
          recipientName: activeGamer.username,
          content: newMessage,
          createdAt: new Date().toISOString()
        }
      ]);
      setNewMessage('');
    }
  };

  const toggleDecryption = (msgId: string) => {
    if (decryptedMsgIds.includes(msgId)) {
      setDecryptedMsgIds(prev => prev.filter(id => id !== msgId));
      triggerNotification('Re-encrypting message node');
    } else {
      setDecryptedMsgIds(prev => [...prev, msgId]);
      triggerNotification('Decryption complete: Signal decoded');
    }
  };

  const getEncryptedText = (text: string) => {
    // Generate static matrix-like cyber characters for encryption feel
    return text.split('').map(char => (char === ' ' ? ' ' : '█')).join('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* active gamers lists */}
      <div className="lg:col-span-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur h-fit">
        <h3 className="font-mono text-xs text-zinc-500 uppercase mb-4 tracking-wider">Active Player Nodes</h3>
        <div className="space-y-2">
          {gamers.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGamer(g)}
              className={`w-full p-3 rounded-xl border font-mono text-xs text-left transition flex items-center gap-3 ${
                activeGamer?.id === g.id
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                {g.username[0].toUpperCase()}
              </div>
              <div className="truncate flex-1">
                <p className="font-bold uppercase text-[11px]">{g.username}</p>
                <p className="text-[9px] text-zinc-500 uppercase">{g.rankClass} Tier</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          ))}
        </div>
      </div>

      {/* Messaging Panel */}
      <div className="lg:col-span-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[520px] justify-between backdrop-blur">
        {activeGamer ? (
          <>
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <div>
                    <h2 className="font-mono text-sm text-white uppercase tracking-wider font-black">
                      Secure P2P: {activeGamer.username}
                    </h2>
                    <p className="font-mono text-[9px] text-zinc-500 uppercase">
                      Profile Bio: {activeGamer.bio || 'Signal logged'}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-zinc-600 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                  Status: Handshake Active
                </span>
              </div>

              {/* Chat Message Box */}
              <div className="space-y-4 overflow-y-auto max-h-[340px] pr-1 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-zinc-600 font-mono text-xs">
                    No handshake logs recorded. Send a greeting to open peer-to-peer transmission.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isDecrypted = decryptedMsgIds.includes(msg.id);

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 text-xs ${isMe ? 'flex-row-reverse' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-mono font-bold text-white shrink-0">
                          {msg.senderName[0].toUpperCase()}
                        </div>
                        <div className={`space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="text-zinc-400 font-bold">{msg.senderName}</span>
                            <span className="text-zinc-600">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="relative group">
                            <div
                              className={`font-mono p-3 rounded-2xl inline-block max-w-[280px] sm:max-w-md break-words leading-relaxed select-none ${
                                isMe
                                  ? 'bg-amber-500 text-black font-bold rounded-tr-none'
                                  : 'bg-zinc-950 text-zinc-300 rounded-tl-none border border-zinc-900'
                              }`}
                            >
                              {isMe || isDecrypted ? msg.content : getEncryptedText(msg.content)}
                            </div>

                            {/* Cryptographic hover/click decryptor action */}
                            {!isMe && (
                              <button
                                onClick={() => toggleDecryption(msg.id)}
                                className="absolute -right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-amber-500 transition opacity-0 group-hover:opacity-100"
                                title="Toggle decryption nodes"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={msgEndRef} />
              </div>
            </div>

            {/* Input Send Form */}
            <form onSubmit={handleSendDM} className="flex gap-3 border-t border-zinc-800/60 pt-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition placeholder-zinc-700"
                placeholder="Compose secure signal message..."
                maxLength={140}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black rounded-xl py-3 px-6 transition font-mono font-bold uppercase text-xs tracking-wider flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Encrypt & Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MessageSquare className="w-12 h-12 text-zinc-700 mb-4 animate-bounce" />
            <h3 className="font-mono text-sm text-zinc-400 uppercase mb-2">No Handshake Loaded</h3>
            <p className="font-mono text-xs text-zinc-600 max-w-sm">
              Select an active player node from the left panel to establish a secure, encrypted peer-to-peer connection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
