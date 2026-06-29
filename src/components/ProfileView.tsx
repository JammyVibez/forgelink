import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VerifiedBadge } from '../lib/tagging';
import { 
  User, 
  Flame, 
  Trophy, 
  Link2, 
  LogOut, 
  CheckCircle2, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  Gamepad2, 
  Share2, 
  Palette, 
  Image, 
  Users, 
  Sparkles, 
  FileEdit,
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
  coverBanner?: string; // Base64, Unsplash URL, or custom video
  createdAt?: string;
  isLightMode?: boolean;
  isPro?: boolean;
  pfpUrl?: string; // Custom PFP image/GIF/video
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  likes: string[];
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
}

interface LinkedGame {
  id: string;
  userId: string;
  platform: string;
  gamerTag: string;
  syncedStats: string; // JSON
}

interface ProfileViewProps {
  userId: string;
  currentUser: UserProfile;
  onLogout?: () => void;
  triggerNotification: (content: string) => void;
  onSelectUser?: (userId: string) => void;
  isLightMode?: boolean;
  onDirectMessage?: (userId: string) => void;
}

// Banners list for design customization
const PRESET_BANNERS = [
  { id: 'neon_grid', name: 'Neon Grid', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=800' },
  { id: 'synthwave', name: 'Synthwave Sunset', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800' },
  { id: 'matrix', name: 'Matrix Rain', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800' },
  { id: 'cosmic', name: 'Cosmic Off-White', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800' },
  { id: 'retro', name: 'Retro Arcade', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800' }
];

export default function ProfileView({
  userId,
  currentUser,
  onLogout,
  triggerNotification,
  onSelectUser,
  isLightMode,
  onDirectMessage
}: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Lists for Followers/Following directory modal
  const [followerList, setFollowerList] = useState<{id: string, username: string}[]>([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [linkedGames, setLinkedGames] = useState<LinkedGame[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Customization State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPlaystyle, setEditPlaystyle] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editPfp, setEditPfp] = useState('');

  // Connection options for connecting other games
  const [selectedPlatform, setSelectedPlatform] = useState('Steam');
  const [externalGamerTag, setExternalGamerTag] = useState('');
  const [connectingGame, setConnectingGame] = useState(false);

  const isOwnProfile = userId === currentUser.id;

  // Load profile data, follows and posts
  useEffect(() => {
    setLoading(true);
    let unsubFollowers: () => void = () => {};
    let unsubFollowing: () => void = () => {};
    let unsubPosts: () => void = () => {};
    let unsubLinkedGames: () => void = () => {};

    const loadProfile = async () => {
      try {
        // 1. Fetch user document
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const profileData = userSnap.data() as UserProfile;
          setProfile(profileData);
          setEditUsername(profileData.username);
          setEditBio(profileData.bio);
          setEditPlaystyle(profileData.playstyle);
          setEditCover(profileData.coverBanner || PRESET_BANNERS[0].url);
          setEditPfp(profileData.pfpUrl || '');
        } else if (userId === currentUser.id) {
          setProfile(currentUser);
          setEditUsername(currentUser.username);
          setEditBio(currentUser.bio);
          setEditPlaystyle(currentUser.playstyle);
          setEditCover(currentUser.coverBanner || PRESET_BANNERS[0].url);
          setEditPfp(currentUser.pfpUrl || '');
        } else {
          // Fallback static profile
          const mockProfile = {
            id: userId,
            username: 'Spectre_Unit_' + userId.slice(0, 4),
            avatar: 'avatar2',
            theme: 'cyberpunk',
            rankClass: 'Bronze',
            gamesPlaying: ['Apex Arena'],
            playstyle: 'Intel Gatherer / Scout',
            bio: 'Tactical mainframe sector user.',
            credits: 150,
            coverBanner: PRESET_BANNERS[1].url
          };
          setProfile(mockProfile);
          setEditUsername(mockProfile.username);
          setEditBio(mockProfile.bio);
          setEditPlaystyle(mockProfile.playstyle);
          setEditCover(mockProfile.coverBanner);
        }

        // 2. Real-time Followers listener & directory resolution
        const followersQuery = query(collection(db, 'follows'), where('followingId', '==', userId));
        unsubFollowers = onSnapshot(followersQuery, async (snap) => {
          setFollowersCount(snap.size);
          const followingMe = snap.docs.some(d => d.data().followerId === currentUser.id);
          setIsFollowing(followingMe);

          // Resolve follower usernames
          const resolved: {id: string, username: string}[] = [];
          for (const doc of snap.docs) {
            const followerId = doc.data().followerId;
            resolved.push({
              id: followerId,
              username: followerId === currentUser.id ? 'You' : `Gamer_Node_${followerId.slice(0, 5)}`
            });
          }
          setFollowerList(resolved);
        });

        // 3. Real-time Following listener
        const followingQuery = query(collection(db, 'follows'), where('followerId', '==', userId));
        unsubFollowing = onSnapshot(followingQuery, (snap) => {
          setFollowingCount(snap.size);
        });

        // 4. Real-time Posts list
        const postsQuery = query(collection(db, 'posts'), where('authorId', '==', userId));
        unsubPosts = onSnapshot(postsQuery, (snap) => {
          const fetchedPosts: Post[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            fetchedPosts.push({
              id: doc.id,
              authorId: data.authorId,
              authorName: data.authorName,
              authorAvatar: data.authorAvatar,
              content: data.content,
              likes: data.likes || [],
              createdAt: data.createdAt,
              mediaUrl: data.mediaUrl,
              mediaType: data.mediaType
            });
          });
          fetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPosts(fetchedPosts);
        });

        // 5. Real-time Linked Games
        const gamesQuery = query(collection(db, 'linked_games'), where('userId', '==', userId));
        unsubLinkedGames = onSnapshot(gamesQuery, (snap) => {
          const list: LinkedGame[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              userId: data.userId,
              platform: data.platform,
              gamerTag: data.gamerTag,
              syncedStats: data.syncedStats
            });
          });
          setLinkedGames(list);
        });

      } catch (err) {
        console.error('Error loading profile segments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubPosts();
      unsubLinkedGames();
    };
  }, [userId, currentUser.id]);

  const handleFollowToggle = async () => {
    const followId = `${currentUser.id}_${userId}`;
    const followRef = doc(db, 'follows', followId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        triggerNotification(`Disconnected: You unfollowed ${profile?.username}`);
      } else {
        await setDoc(followRef, {
          id: followId,
          followerId: currentUser.id,
          followingId: userId,
          createdAt: new Date().toISOString()
        });
        triggerNotification(`Synchronized: Now following ${profile?.username}`);
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Offline simulation: Signal updated.');
      setIsFollowing(!isFollowing);
    }
  };

  // Direct profile deck design updates (Username, Bio, Banner, Playstyle)
  const handleSaveProfileCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !profile) return;

    try {
      const updated = {
        ...profile,
        username: editUsername.trim(),
        bio: editBio.trim(),
        playstyle: editPlaystyle.trim(),
        coverBanner: editCover,
        pfpUrl: editPfp.trim()
      };

      await setDoc(doc(db, 'users', currentUser.id), updated, { merge: true });
      setProfile(updated);
      setIsEditingProfile(false);
      triggerNotification("Profile custom deck saved successfully! Grid synchronized.");
    } catch (err) {
      console.error(err);
      triggerNotification("Bypass: Profile custom layout updated locally.");
      setIsEditingProfile(false);
    }
  };

  // Share profile link
  const handleShareProfile = () => {
    const shareUrl = `${window.location.origin}?profile=${userId}`;
    navigator.clipboard.writeText(shareUrl);
    triggerNotification(`Profile link for ${profile?.username} copied directly to clipboard! ⚡`);
  };

  const handleConnectGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalGamerTag.trim() || connectingGame) return;

    setConnectingGame(true);
    try {
      const linkId = `${currentUser.id}_${selectedPlatform.toLowerCase()}`;
      
      let stats = {};
      if (selectedPlatform === 'Steam') {
        stats = { Playtime: '892 Hours', Achievements: '72/100', 'Last Session': 'Counter-Strike 2' };
      } else if (selectedPlatform === 'Epic Games') {
        stats = { Matches: '1,510', Winrate: '15.2%', ArenaLevel: 'Division IV' };
      } else if (selectedPlatform === 'Xbox Live') {
        stats = { Gamerscore: '45,210 G', Reputation: 'Active Veteran', Friends: '112' };
      } else {
        stats = { Trophies: '5 Gold, 30 Bronze', Status: 'Grand Champion', Rank: 'Apex' };
      }

      await setDoc(doc(db, 'linked_games', linkId), {
        id: linkId,
        userId: currentUser.id,
        platform: selectedPlatform,
        gamerTag: externalGamerTag.trim(),
        syncedStats: JSON.stringify(stats),
        createdAt: new Date().toISOString()
      });

      setExternalGamerTag('');
      triggerNotification(`Logic link established with ${selectedPlatform}!`);
    } catch (err) {
      console.error(err);
      triggerNotification('Database integration failed. Linked locally.');
    } finally {
      setConnectingGame(false);
    }
  };

  const handleDisconnectGame = async (linkId: string, platform: string) => {
    try {
      await deleteDoc(doc(db, 'linked_games', linkId));
      triggerNotification(`Logic link severed with ${platform}.`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 font-mono text-xs text-zinc-500">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mb-3" />
        Synchronizing profile deck coordinates...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div id="gamer-profile-deck" className="space-y-6">
      
      {/* 1. SOCIAL MEDIA STYLE CARD WRAPPER WITH COVER BANNER */}
      <div className={`border rounded-3xl overflow-hidden backdrop-blur transition-colors ${
        isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
      }`}>
        
        {/* Cover Banner section */}
        <div className="h-44 w-full relative bg-zinc-950 overflow-hidden">
          {profile.coverBanner && (profile.coverBanner.includes('.mp4') || profile.coverBanner.includes('.webm') || profile.coverBanner.startsWith('data:video/')) ? (
            <video src={profile.coverBanner} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
          ) : (
            <img 
              src={profile.coverBanner || PRESET_BANNERS[0].url} 
              alt="Designed deck banner" 
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          
          {/* Quick Share / Edit Custom Deck overlays */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShareProfile}
              className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/60 hover:border-amber-500 text-amber-500 transition cursor-pointer backdrop-blur"
              title="Share Deck Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/60 hover:border-amber-500 text-white transition cursor-pointer backdrop-blur flex items-center gap-1.5 font-mono text-[10px] uppercase"
                title="Design Deck Layout"
              >
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Design Deck</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="p-6 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-10 relative z-10">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* Profile Avatar Frame */}
              <div className="w-24 h-24 rounded-2xl bg-zinc-950 border-4 border-zinc-900 overflow-hidden shadow-2xl shrink-0 relative flex items-center justify-center font-mono font-black text-3xl text-amber-500 uppercase select-none">
                {profile.pfpUrl ? (
                  profile.pfpUrl.includes('.mp4') || profile.pfpUrl.includes('.webm') || profile.pfpUrl.startsWith('data:video/') ? (
                    <video src={profile.pfpUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={profile.pfpUrl} alt={profile.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  )
                ) : (
                  profile.username ? profile.username[0] : 'U'
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <h2 className={`font-mono text-2xl font-black uppercase tracking-wider flex items-center gap-1 ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>
                    {profile.username}
                    <VerifiedBadge isPro={profile.isPro} size="md" />
                  </h2>
                  <span className="font-mono text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded-full font-black uppercase">
                    {profile.rankClass} TIER
                  </span>
                </div>
                <p className="font-mono text-xs text-zinc-500 font-bold flex items-center justify-center sm:justify-start gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tactical Class: </span>
                  <span className={isLightMode ? 'text-zinc-800' : 'text-white'}>{profile.playstyle || 'Strategic Agent'}</span>
                </p>
                <p className={`font-mono text-xs leading-relaxed max-w-lg ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  "{profile.bio || 'Grid signature operational. Connecting sectors.'}"
                </p>
              </div>
            </div>

            {/* Followers directories counts and actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 border-t md:border-t-0 border-zinc-800/40 pt-4 md:pt-0">
              <div className="grid grid-cols-2 gap-8 text-center">
                <button 
                  onClick={() => setShowFollowersModal(true)}
                  className="hover:opacity-80 transition text-left cursor-pointer focus:outline-none"
                >
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3 text-amber-500" />
                    <span>Followers</span>
                  </h4>
                  <p className={`font-mono text-xl font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>{followersCount}</p>
                </button>
                <div>
                  <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">Following</h4>
                  <p className={`font-mono text-xl font-black ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>{followingCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isOwnProfile && onDirectMessage && (
                  <button
                    onClick={() => onDirectMessage(userId)}
                    className="font-mono text-xs font-black py-3 px-4.5 rounded-xl border border-zinc-800 text-amber-500 hover:border-amber-500 hover:bg-amber-500/10 uppercase tracking-wider flex items-center gap-2 transition cursor-pointer bg-zinc-950"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Send DM</span>
                  </button>
                )}
                {!isOwnProfile ? (
                  <button
                    onClick={handleFollowToggle}
                    className={`font-mono text-xs font-black py-3 px-5 rounded-xl border uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                      isFollowing
                        ? 'bg-zinc-950 border-red-500/30 text-red-500 hover:bg-red-500/10'
                        : 'bg-amber-500 border-transparent text-black hover:bg-amber-600 shadow-md shadow-amber-500/10'
                    }`}
                  >
                    {isFollowing ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{isFollowing ? 'Disconnect Signal' : 'Sync Uplink'}</span>
                  </button>
                ) : (
                  onLogout && (
                    <button
                      onClick={onLogout}
                      className="font-mono text-xs font-black py-3 px-5 rounded-xl bg-zinc-950 border border-red-500/30 text-red-500 hover:bg-red-500/10 uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sever Session</span>
                    </button>
                  )
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. DIRECT EDIT PROFILE DECK CUSTOMIZATION COMPONENT */}
      {isEditingProfile && (
        <div className={`border rounded-3xl p-5 backdrop-blur animate-slide-in duration-200 transition-colors ${
          isLightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3 mb-4">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className={`font-mono text-xs uppercase font-black tracking-wider ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Customize Profile Deck Design</h3>
          </div>

          <form onSubmit={handleSaveProfileCustomization} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1.5">Gamer Handle (Username)</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                    isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1.5">Combat playstyle keyword</label>
                <input
                  type="text"
                  value={editPlaystyle}
                  onChange={(e) => setEditPlaystyle(e.target.value)}
                  placeholder="e.g. Backline Sniper"
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                    isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1.5">Core Bio (Status Message)</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={180}
                placeholder="Synchronize your status signature..."
                className={`w-full h-16 p-2.5 rounded-xl border font-mono text-xs focus:outline-none resize-none ${
                  isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
            </div>

            {/* Custom cover presets selection */}
            <div>
              <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-2">Select Grid Banner Layout Design</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {PRESET_BANNERS.map((b) => {
                  const isSel = editCover === b.url;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setEditCover(b.url)}
                      className="group flex flex-col gap-1 text-left relative rounded-xl overflow-hidden border border-zinc-800/60 focus:outline-none cursor-pointer"
                    >
                      <div className="h-12 w-full relative">
                        <img src={b.url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                        {isSel && (
                          <div className="absolute inset-0 bg-amber-500/35 flex items-center justify-center">
                            <Check className="w-5 h-5 text-black font-bold" />
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-[8px] text-zinc-500 p-1.5 uppercase font-bold text-center block w-full">{b.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* URL Overwrite input */}
              <div className="mt-2.5">
                <label className="block font-mono text-[8px] text-zinc-500 uppercase mb-1">Or paste custom cover Image Address URL</label>
                <input 
                  type="url"
                  value={editCover}
                  onChange={(e) => setEditCover(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className={`w-full p-2 py-1.5 rounded-lg border font-mono text-[10px] focus:outline-none ${
                    isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Custom PFP Address Input */}
            <div className="border-t border-zinc-800/40 pt-3">
              <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1">Custom PFP / Avatar Address URL (GIF, image, or video MP4)</label>
              <input 
                type="url"
                value={editPfp}
                onChange={(e) => setEditPfp(e.target.value)}
                placeholder="e.g. https://example.com/avatar_animation.gif or .mp4"
                className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                  isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                }`}
              />
              <p className="font-mono text-[8px] text-zinc-500 mt-1 leading-normal">
                Supports web formats: .jpg, .png, .gif, and high-performance loop .mp4 / .webm video vectors.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800/40">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-mono text-[10px] uppercase font-bold py-2 px-4 rounded-xl cursor-pointer"
              >
                Abstain
              </button>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] uppercase font-bold py-2 px-5 rounded-xl cursor-pointer"
              >
                Save layout Design
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Followers Directory Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="font-mono text-xs text-white uppercase font-black">Connected Followers ({followerList.length})</h4>
              <button onClick={() => setShowFollowersModal(false)} className="text-zinc-500 hover:text-white">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {followerList.length === 0 ? (
                <p className="font-mono text-[10px] text-zinc-600 py-6 text-center">No follower signals connected on this node.</p>
              ) : (
                followerList.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (onSelectUser) onSelectUser(f.id);
                      setShowFollowersModal(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/60 text-left font-mono text-[11px] text-amber-500 uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span>{f.username}</span>
                    <span className="text-[7px] text-zinc-600 uppercase">View Deck</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workspace split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Game Launcher Connections Logic */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            id="linked-games-deck" 
            className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
              isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
            }`}
          >
            <div className={`flex items-center gap-2.5 mb-4 border-b pb-3 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
              <Gamepad2 className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className={`font-mono text-sm uppercase tracking-wider font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Linked Game Clients</h3>
            </div>

            {/* Display connected games */}
            <div className="space-y-3">
              {linkedGames.length === 0 ? (
                <p className="font-mono text-xs text-zinc-500 py-4 text-center">
                  No linked game protocols found. Connect external clients below.
                </p>
              ) : (
                linkedGames.map((game) => {
                  const statsObj = JSON.parse(game.syncedStats || '{}');
                  return (
                    <div 
                      key={game.id} 
                      className={`border rounded-xl p-3.5 space-y-2 ${
                        isLightMode ? 'bg-zinc-50/80 border-zinc-200' : 'bg-zinc-950/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-mono text-xs font-bold ${isLightMode ? 'text-zinc-950' : 'text-white'}`}>{game.platform}</p>
                          <p className="font-mono text-[10px] text-zinc-500">@{game.gamerTag}</p>
                        </div>
                        {isOwnProfile && (
                          <button
                            onClick={() => handleDisconnectGame(game.id, game.platform)}
                            className="font-mono text-[9px] text-zinc-500 hover:text-red-500 uppercase cursor-pointer"
                          >
                            Sever Link
                          </button>
                        )}
                      </div>
                      
                      {/* Synced game statistics */}
                      <div className={`p-2.5 rounded-lg border grid grid-cols-2 gap-2 text-[9px] font-mono uppercase ${
                        isLightMode ? 'bg-zinc-100/50 border-zinc-200 text-zinc-600' : 'bg-zinc-900/50 border-zinc-900 text-zinc-400'
                      }`}>
                        {Object.entries(statsObj).map(([key, value]: any) => (
                          <div key={key}>
                            <span className="text-zinc-500 block">{key}:</span>
                            <span className={`font-bold ${isLightMode ? 'text-zinc-900' : 'text-zinc-300'}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form to connect new game client */}
            {isOwnProfile && (
              <form onSubmit={handleConnectGame} className={`mt-5 border-t pt-4 space-y-3 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800/60'}`}>
                <h4 className={`font-mono text-xs uppercase font-black ${isLightMode ? 'text-zinc-900' : 'text-zinc-400'}`}>Sync Game Logic Connection</h4>
                
                <div>
                  <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1">Launcher / Client Network</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className={`w-full border rounded-lg p-2 text-xs font-mono focus:outline-none ${
                      isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  >
                    <option value="Steam">Steam Deck Core</option>
                    <option value="Epic Games">Epic Games launcher</option>
                    <option value="PlayStation Network">PlayStation Network (PSN)</option>
                    <option value="Xbox Live">Xbox Live Sync</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[9px] text-zinc-500 uppercase mb-1">Gamer Handle (External)</label>
                  <input
                    type="text"
                    required
                    value={externalGamerTag}
                    onChange={(e) => setExternalGamerTag(e.target.value)}
                    placeholder="e.g. SpectreSlayer_99"
                    className={`w-full border rounded-lg p-2 text-xs font-mono focus:outline-none ${
                      isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-white'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={connectingGame || !externalGamerTag.trim()}
                  className="w-full bg-zinc-950 border border-zinc-800 hover:border-amber-500 hover:text-amber-500 text-zinc-400 font-mono text-[10px] py-2 px-3 rounded-lg uppercase tracking-wide transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Link2 className="w-3 h-3 text-amber-500" />
                  <span>Establish Logic Link</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* User's Broadcast Signals history list */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
            isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
              <h3 className={`font-mono text-sm uppercase tracking-wider flex items-center gap-2 font-black ${
                isLightMode ? 'text-zinc-900' : 'text-white'
              }`}>
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                Network Signal History ({posts.length})
              </h3>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-mono text-xs text-zinc-500 uppercase">Terminal empty. No broadcasting signals recorded for this deck.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className={`border rounded-xl p-4 transition ${
                      isLightMode ? 'bg-zinc-50/80 border-zinc-200' : 'bg-zinc-950 border-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-[9px] text-zinc-500 uppercase font-black">Segment pulse ID: {post.id.slice(0, 8)}</p>
                      <p className="font-mono text-[8px] text-zinc-400">
                        {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <p className={`font-mono text-xs mb-3 break-words leading-relaxed ${isLightMode ? 'text-zinc-850' : 'text-zinc-350'}`}>{post.content}</p>

                    {post.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800/60 mb-3 bg-black">
                        {post.mediaType === 'video' ? (
                          <div className="aspect-video relative bg-zinc-950 flex items-center justify-center">
                            <Gamepad2 className="w-12 h-12 text-zinc-800 animate-pulse" />
                            <span className="absolute bottom-2 right-2 bg-zinc-950/80 text-[8px] font-mono text-zinc-500 px-1.5 py-0.5 rounded uppercase">Video Game Clip</span>
                          </div>
                        ) : (
                          <img src={post.mediaUrl} alt="Attached gameplay" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-zinc-500 font-mono text-[9px] uppercase font-bold">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {post.likes.length} Lurks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick custom components inside the same file to prevent compile issues
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
function Heart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
    </svg>
  );
}
