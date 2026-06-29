import React, { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Send, 
  Heart, 
  Sparkles, 
  MessageSquare, 
  Flame, 
  Image, 
  Video, 
  Link2, 
  Check, 
  ExternalLink, 
  Edit2, 
  Trash2, 
  Share2, 
  FileUp, 
  X 
} from 'lucide-react';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  likes: string[];
  createdAt: string;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  replyTo?: {
    authorName: string;
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
}

interface FeedViewProps {
  currentUser: UserProfile;
  triggerNotification: (content: string) => void;
  onSelectUser: (userId: string) => void;
  isLightMode?: boolean;
}

export default function FeedView({ currentUser, triggerNotification, onSelectUser, isLightMode }: FeedViewProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Media Attachment State (File or Link)
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editing state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Active Post Comments Expanded Map
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [replyingToComment, setReplyingToComment] = useState<{ [postId: string]: Comment | null }>({});

  // Sync posts with Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          id: doc.id,
          authorId: data.authorId,
          authorName: data.authorName,
          authorAvatar: data.authorAvatar,
          content: data.content,
          mediaUrl: data.mediaUrl || '',
          mediaType: data.mediaType || '',
          likes: data.likes || [],
          createdAt: data.createdAt
        });
      });
      setPosts(postsData);
    }, (error) => {
      console.error("Firestore sync error on feed:", error);
      // Fallback local state if database offline
      setPosts([
        {
          id: 'p1',
          authorId: 'u2',
          authorName: 'HexValkyrie',
          authorAvatar: 'avatar2',
          content: 'Just ran a 12-win streak in Aegis Arena! Add me for competitive rank push.',
          mediaUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
          mediaType: 'image',
          likes: ['u1', 'u3'],
          createdAt: new Date().toISOString()
        }
      ]);
    });

    return () => unsubscribe();
  }, []);

  // Handle local Phone/PC File Upload using standard FileReader with Canvas-based compression to stay below Firestore's 1MB limit
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        
        // Compress image using Canvas
        const img = new window.Image();
        img.src = base64Data;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            // Validate size
            if (compressedBase64.length > 1048576) {
              triggerNotification("Error: Compressed image is still too large.");
              setUploadProgress(false);
              return;
            }

            setMediaUrl(compressedBase64);
            setMediaType('image');
            setUploadProgress(false);
            triggerNotification(`Image imported & compressed: [${file.name.slice(0, 15)}] is staged.`);
          } else {
            // Fallback
            if (base64Data.length > 1048576) {
              triggerNotification("Error: Raw image size exceeds 1MB limit.");
              setUploadProgress(false);
              return;
            }
            setMediaUrl(base64Data);
            setMediaType('image');
            setUploadProgress(false);
            triggerNotification(`Image imported: [${file.name.slice(0, 15)}] is staged.`);
          }
        };

        img.onerror = () => {
          console.error("Image loading failed for compression");
          if (base64Data.length > 1048576) {
            triggerNotification("Error: Raw image size exceeds 1MB limit.");
            setUploadProgress(false);
            return;
          }
          setMediaUrl(base64Data);
          setMediaType('image');
          setUploadProgress(false);
          triggerNotification(`Image imported: [${file.name.slice(0, 15)}] is staged.`);
        };
      };

      reader.onerror = () => {
        console.error("File read failed");
        setUploadProgress(false);
        triggerNotification("Error: Failed to read local image file.");
      };

      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      // Direct Firestore document size limit is 1MB, so limit video size to 800KB
      if (file.size > 800000) {
        triggerNotification("Error: Video file too large (Max 800KB). Use links for larger clips.");
        setUploadProgress(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        if (base64Data.length > 1048576) {
          triggerNotification("Error: Base64 video exceeds 1MB Firestore limit.");
          setUploadProgress(false);
          return;
        }

        setMediaUrl(base64Data);
        setMediaType('video');
        setUploadProgress(false);
        triggerNotification(`Video staged successfully: [${file.name.slice(0, 15)}].`);
      };

      reader.onerror = () => {
        console.error("Video file read failed");
        setUploadProgress(false);
        triggerNotification("Error: Failed to read local video file.");
      };

      reader.readAsDataURL(file);
    } else {
      triggerNotification("Error: Unsupported file format.");
      setUploadProgress(false);
    }
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Run server moderation with Gemini or fallback directly
      let finalContent = newPost;
      try {
        const modRes = await fetch('/api/gemini/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newPost })
        });
        if (modRes.ok) {
          const modData = await modRes.json();
          if (modData.flagged) {
            finalContent = modData.cleanVersion;
            triggerNotification('Signal filtered: Cyber-mods cleaned toxic content');
          }
        }
      } catch (moderationErr) {
        console.warn('Moderation api offline, continuing signal broadcast.');
      }

      const postData: any = {
        authorId: currentUser.id,
        authorName: currentUser.username,
        authorAvatar: currentUser.avatar,
        content: finalContent,
        likes: [],
        createdAt: new Date().toISOString()
      };

      if (mediaType !== 'none' && mediaUrl.trim()) {
        postData.mediaUrl = mediaUrl;
        postData.mediaType = mediaType;
      }

      await addDoc(collection(db, 'posts'), postData);

      setNewPost('');
      setMediaUrl('');
      setMediaType('none');
      triggerNotification('Signal broadcast: Cyber deck update pushed to the feed');
    } catch (err) {
      console.error(err);
      triggerNotification('Lobby interruption: Broadcast delayed');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Edit Post Capability
  const handleStartEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { content: editContent.trim() });
      setEditingPostId(null);
      triggerNotification("Signal updated: Broadcast changes synchronized.");
    } catch (err) {
      console.error("Post edit error:", err);
      triggerNotification("Database connection failed. Changes simulated locally.");
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent } : p));
      setEditingPostId(null);
    }
  };

  // 2. Delete Post Capability
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Sever and erase this broadcast signature forever?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      triggerNotification("Signal severed: Post removed from the feed grid.");
    } catch (err) {
      console.error("Post delete error:", err);
      triggerNotification("Database connection failed. Post removed locally.");
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  // 3. Share Post Deep-Link Capability
  const handleSharePost = (post: Post) => {
    const shareUrl = `${window.location.origin}?profile=${post.authorId}`;
    navigator.clipboard.writeText(shareUrl);
    triggerNotification(`Copied shareable profile deck link for ${post.authorName}!`);
  };

  const handleLikePost = async (postId: string, currentLikes: string[]) => {
    const isLiked = currentLikes.includes(currentUser.id);
    const postRef = doc(db, 'posts', postId);

    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle comments expander and subscribe to real-time comments subcollection
  const handleToggleComments = (postId: string) => {
    const isExpanded = !!expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded) {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));

      const unsub = onSnapshot(q, (snapshot) => {
        const commentsList: Comment[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          commentsList.push({
            id: doc.id,
            postId,
            authorId: d.authorId,
            authorName: d.authorName,
            authorAvatar: d.authorAvatar,
            content: d.content,
            createdAt: d.createdAt,
            replyTo: d.replyTo || null
          });
        });
        setCommentsMap(prev => ({ ...prev, [postId]: commentsList }));
      }, (err) => {
        console.error('Comments subcollection sync failed:', err);
      });

      return unsub;
    }
  };

  const handleSendComment = async (postId: string) => {
    const input = commentInputs[postId] || '';
    if (!input.trim()) return;

    const replyTarget = replyingToComment[postId] || null;

    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentsRef, {
        postId,
        authorId: currentUser.id,
        authorName: currentUser.username,
        authorAvatar: currentUser.avatar,
        content: input.trim(),
        createdAt: new Date().toISOString(),
        replyTo: replyTarget ? { authorName: replyTarget.authorName, content: replyTarget.content } : null
      });

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setReplyingToComment(prev => ({ ...prev, [postId]: null }));
      triggerNotification('Comment synchronized with database.');
    } catch (err) {
      console.error(err);
      triggerNotification('Comment coordinate broadcast interrupted');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Broadcast Creator Panel */}
      <div 
        id="broadcast-creator-panel" 
        className={`lg:col-span-1 border rounded-3xl p-5 h-fit backdrop-blur space-y-4 transition-colors ${
          isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}
      >
        <div className={`flex items-center gap-2 border-b pb-3 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 className={`font-mono text-sm uppercase tracking-wider font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Broadcaster Node</h2>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-2">Write terminal signal...</label>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className={`w-full h-28 border rounded-xl p-3 font-mono focus:outline-none transition resize-none text-xs ${
                isLightMode 
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-950 placeholder-zinc-400' 
                  : 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700'
              }`}
              placeholder="Broadcasting gaming pulse... 'Just hit maximum level on Steam Deck!'"
              maxLength={280}
            />
          </div>

          {/* Local Phone/PC Upload & Media Type Selectors */}
          <div className="space-y-2">
            <label className="block font-mono text-[10px] text-zinc-500 uppercase mb-1">Add Visual Signal</label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('none')}
                className={`py-2 px-2.5 rounded-xl border font-mono text-[9px] uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'none'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                    : isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <span>No Media</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaType('image');
                  fileInputRef.current?.click();
                }}
                className={`py-2 px-2.5 rounded-xl border font-mono text-[9px] uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'image'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                    : isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                <span>Upload file</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`py-2 px-2.5 rounded-xl border font-mono text-[9px] uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'video'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 font-bold'
                    : isLightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video link</span>
              </button>
            </div>

            {/* Hidden Input field for native Phone/PC library files */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleLocalFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />

            {/* Staged media indicator or Link manual entry */}
            {mediaType !== 'none' && (
              <div className="space-y-1">
                {mediaUrl.startsWith('data:') ? (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-[10px] ${
                    isLightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-zinc-400 truncate">Device local file staged!</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setMediaUrl(''); setMediaType('none'); }}
                      className="text-zinc-500 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Link2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="Paste online image/video URL address"
                      className={`w-full py-2 pl-8 pr-3 text-[10px] font-mono border rounded-xl focus:outline-none focus:border-amber-500 ${
                        isLightMode 
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900' 
                          : 'bg-zinc-950 border-zinc-800 text-white'
                      }`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`flex items-center justify-between pt-2 border-t ${isLightMode ? 'border-zinc-100' : 'border-zinc-800/60'}`}>
            <span className="font-mono text-[10px] text-zinc-500">{280 - newPost.length} chars remaining</span>
            <button
              type="submit"
              disabled={submitting || !newPost.trim() || uploadProgress}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-black font-mono font-bold py-2 px-4 rounded-xl transition uppercase tracking-wider text-xs flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Filtering...' : 'Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcasting Feed Panel */}
      <div id="broadcasting-feed-panel" className="lg:col-span-2 space-y-4">
        <div className={`border rounded-3xl p-5 backdrop-blur transition-colors ${
          isLightMode ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isLightMode ? 'border-zinc-100' : 'border-zinc-800'}`}>
            <h3 className={`font-mono text-sm uppercase tracking-wider flex items-center gap-2 font-black ${
              isLightMode ? 'text-zinc-900' : 'text-white'
            }`}>
              <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              Live Net Signals ({posts.length})
            </h3>
            <span className="font-mono text-[9px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
              Core Node Connected
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-xs text-zinc-500 uppercase">Terminal silence. No active social broadcasts found on this grid segment.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
              {posts.map((post) => {
                const isLiked = post.likes.includes(currentUser.id);
                const hasMedia = !!post.mediaUrl;
                const isCommentsExpanded = !!expandedComments[post.id];
                const comments = commentsMap[post.id] || [];
                const isMyPost = post.authorId === currentUser.id;
                const isEditing = editingPostId === post.id;

                return (
                  <div
                    key={post.id}
                    className={`border rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                      isLightMode 
                        ? 'bg-zinc-50/60 border-zinc-200/70 hover:border-zinc-300' 
                        : 'bg-zinc-950 border-zinc-900/80 hover:border-zinc-800'
                    }`}
                  >
                    {/* Author block */}
                    <div className="flex items-start justify-between mb-3">
                      <button
                        onClick={() => onSelectUser(post.authorId)}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition bg-transparent border-none cursor-pointer focus:outline-none"
                      >
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-xs text-amber-500">
                          {post.authorName ? post.authorName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className={`font-mono text-xs font-black flex items-center gap-1 uppercase tracking-wide ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                            {post.authorName}
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500 inline" />
                          </p>
                          <p className="font-mono text-[8px] text-zinc-400">
                            {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </button>

                      {/* Header quick deck controls */}
                      <div className="flex items-center gap-2">
                        {isMyPost && !isEditing && (
                          <>
                            <button 
                              onClick={() => handleStartEdit(post)}
                              title="Edit Signal"
                              className="p-1.5 rounded-lg border border-zinc-800/40 hover:border-amber-500/30 text-zinc-500 hover:text-amber-500 transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              title="Delete Signal"
                              className="p-1.5 rounded-lg border border-zinc-800/40 hover:border-red-500/30 text-zinc-500 hover:text-red-500 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleSharePost(post)}
                          title="Share Signal Deep-Link"
                          className="p-1.5 rounded-lg border border-zinc-800/40 hover:border-blue-500/30 text-zinc-500 hover:text-blue-500 transition cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-[8px] text-zinc-500 bg-zinc-100/10 px-1.5 py-0.5 rounded">SIG: {post.id.slice(0, 5)}</span>
                      </div>
                    </div>

                    {/* Content area: Render text or Edit Text Box */}
                    {isEditing ? (
                      <div className="space-y-2 mb-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-amber-500 ${
                            isLightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-white'
                          }`}
                          maxLength={280}
                        />
                        <div className="flex gap-2 justify-end">
                          <button 
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold"
                          >
                            Cancel
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleSaveEdit(post.id)}
                            className="bg-amber-500 text-black px-3.5 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`font-mono text-xs leading-relaxed mb-3 break-words ${isLightMode ? 'text-zinc-800' : 'text-zinc-300'}`}>
                        {post.content}
                      </p>
                    )}

                    {/* Media Render (Supports standard links and Base64 Local Device Streams) */}
                    {hasMedia && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800/80 mb-3 bg-black">
                        {post.mediaType === 'video' ? (
                          <div className="aspect-video bg-zinc-950 relative flex flex-col items-center justify-center text-center p-6 border-b border-zinc-900">
                            <Video className="w-12 h-12 text-amber-500/20 animate-pulse mb-2" />
                            <p className="font-mono text-[10px] text-white font-bold uppercase">Broadcasting Video Stream</p>
                            <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-amber-500 underline mt-1.5 flex items-center gap-1 hover:text-amber-400">
                              Open Stream Link <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <img src={post.mediaUrl} alt="Attached tactical signal screenshot" className="w-full max-h-72 object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    )}

                    <div className={`flex items-center gap-5 pt-3 border-t ${isLightMode ? 'border-zinc-100' : 'border-zinc-900/60'}`}>
                      <button
                        onClick={() => handleLikePost(post.id, post.likes)}
                        className={`flex items-center gap-1.5 font-mono text-xs transition bg-transparent border-none cursor-pointer ${
                          isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{post.likes.length} Lurks</span>
                      </button>

                      <button
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-1.5 font-mono text-xs transition bg-transparent border-none cursor-pointer ${
                          isCommentsExpanded ? 'text-amber-500' : 'text-zinc-500 hover:text-amber-500'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Comments</span>
                      </button>
                    </div>

                    {/* Comments block expansion */}
                    {isCommentsExpanded && (
                      <div className={`mt-4 pt-4 border-t space-y-3 ${isLightMode ? 'border-zinc-200/60' : 'border-zinc-900'}`}>
                        <h4 className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider font-black">Secure Comment Mainframe</h4>

                        {/* List comments */}
                        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                          {comments.length === 0 ? (
                            <p className="font-mono text-[10px] text-zinc-500 italic py-2">No comment signatures recorded on this segment.</p>
                          ) : (
                            comments.map((comment) => (
                              <div 
                                key={comment.id} 
                                className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                                  isLightMode ? 'bg-zinc-100/60 border-zinc-200' : 'bg-zinc-900/40 border-zinc-900'
                                }`}
                              >
                                {comment.replyTo && (
                                  <div className="flex items-center gap-1 font-mono text-[8px] text-zinc-500 bg-zinc-950/20 px-2 py-0.5 rounded-md truncate max-w-xs mb-1">
                                    <span className="text-amber-500">↳ Replying to @{comment.replyTo.authorName}:</span>
                                    <span className="italic truncate">"{comment.replyTo.content}"</span>
                                  </div>
                                )}
                                <div className="flex gap-2.5 items-start w-full">
                                  <button
                                    onClick={() => onSelectUser(comment.authorId)}
                                    className="font-mono text-[10px] font-bold text-amber-600 shrink-0 hover:underline uppercase bg-transparent border-none text-left cursor-pointer"
                                  >
                                    {comment.authorName}:
                                  </button>
                                  <div className="space-y-1 flex-1">
                                    <p className={`font-mono text-[11px] break-words ${isLightMode ? 'text-zinc-850' : 'text-zinc-300'}`}>{comment.content}</p>
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-mono text-[7px] text-zinc-500">
                                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <button
                                        onClick={() => setReplyingToComment(prev => ({ ...prev, [post.id]: comment }))}
                                        className="font-mono text-[8px] text-zinc-500 hover:text-amber-500 uppercase font-black cursor-pointer bg-transparent border-none"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Replying indicator */}
                        {replyingToComment[post.id] && (
                          <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/25 p-2 rounded-xl text-xs font-mono text-amber-500 mb-2.5 animate-slide-in">
                            <div className="flex items-center gap-1">
                              <span>Replying to <strong>@{replyingToComment[post.id]?.authorName}</strong>:</span>
                              <span className="truncate max-w-[160px] italic">"{replyingToComment[post.id]?.content}"</span>
                            </div>
                            <button 
                              onClick={() => setReplyingToComment(prev => ({ ...prev, [post.id]: null }))}
                              className="text-zinc-500 hover:text-amber-500 cursor-pointer bg-transparent border-none"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Add comment input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Input secure response signal..."
                            className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500 transition ${
                              isLightMode 
                                ? 'bg-zinc-100 border-zinc-200 text-zinc-950 placeholder-zinc-400' 
                                : 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700'
                            }`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendComment(post.id);
                            }}
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-black px-4 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center uppercase cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
