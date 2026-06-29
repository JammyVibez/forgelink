import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { CheckCircle2 } from 'lucide-react';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: string;
  text: string;
  relatedId: string;
  read: boolean;
  createdAt: string;
}

// Create a real-time notification record in Firestore
export async function createNotification(
  recipientId: string,
  senderId: string,
  senderName: string,
  type: string,
  text: string,
  relatedId?: string
) {
  try {
    // Prevent notifying oneself
    if (recipientId === senderId) return;

    await addDoc(collection(db, 'notifications'), {
      recipientId,
      senderId,
      senderName,
      type,
      text,
      relatedId: relatedId || '',
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to create notification record:', err);
  }
}

// Scans text for @username and pushes notification records to those users
export async function triggerTagNotifications(
  text: string,
  senderId: string,
  senderName: string,
  relatedId: string,
  type: 'post' | 'comment' | 'community_chat' | 'dm'
) {
  const matches = text.match(/@(\w+)/g);
  if (!matches) return;

  const usernames = matches.map(m => m.slice(1));
  const uniqueUsernames = Array.from(new Set(usernames));

  for (const username of uniqueUsernames) {
    if (username.toLowerCase() === senderName.toLowerCase()) continue;

    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const recipientId = snap.docs[0].id;
        let contextText = '';
        if (type === 'post') contextText = 'a post signal';
        else if (type === 'comment') contextText = 'a comment signal';
        else if (type === 'community_chat') contextText = 'community comms chat';
        else if (type === 'dm') contextText = 'a secure DM';

        await createNotification(
          recipientId,
          senderId,
          senderName,
          'tag',
          `@${senderName} tagged you in ${contextText}: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`,
          relatedId
        );
      }
    } catch (err) {
      console.warn('Could not trigger mention notification for:', username, err);
    }
  }
}

// Component to render text with styled clickable @mentions
export function renderTaggedText(
  text: string,
  onSelectUser?: (userId: string) => void,
  isLightMode?: boolean
) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);

  return (
    <span className="break-words">
      {parts.map((part, idx) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <button
              key={idx}
              type="button"
              onClick={async () => {
                if (onSelectUser) {
                  try {
                    // Look up user id from username
                    const q = query(collection(db, 'users'), where('username', '==', username));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      onSelectUser(snap.docs[0].id);
                    } else {
                      console.log('Gamer node not found for:', username);
                    }
                  } catch (err) {
                    console.warn(err);
                  }
                }
              }}
              className="font-mono font-black text-amber-500 hover:text-amber-400 hover:underline inline bg-transparent border-none p-0 cursor-pointer align-baseline text-left font-semibold uppercase tracking-wider text-[11px]"
            >
              {part}
            </button>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

// Renders a verified check badge if user/community is Pro
export function VerifiedBadge({ isPro, size = 'sm' }: { isPro?: boolean; size?: 'xs' | 'sm' | 'md' }) {
  if (!isPro) return null;
  const sizeClasses = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <span className="inline-flex items-center ml-1 select-none align-middle" title="Verified Pro User Deck">
      <CheckCircle2 className={`${sizeClasses} fill-amber-500 text-black border border-black/10 rounded-full`} />
    </span>
  );
}
