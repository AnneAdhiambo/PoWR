"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SimplePool } from "nostr-tools";
import {
  getOrCreateKeypair,
  sendDM,
  subscribeDMs,
  decryptDM,
  RELAYS,
} from "../lib/nostr";
import toast from "react-hot-toast";

export interface NostrMessage {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

export interface NostrConversation {
  id: string;
  name: string;
  recipientPubkey: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
  messages: NostrMessage[];
}

interface UseNostrReturn {
  conversations: NostrConversation[];
  sendMessage: (recipientPubkey: string, text: string) => Promise<void>;
  connected: boolean;
  myPubkey: string;
  openConversation: (pubkey: string, name?: string) => void;
  markRead: (conversationId: string) => void;
}

export function useNostr(
  identifier: string,
  _role: "developer" | "recruiter"
): UseNostrReturn {
  const [conversations, setConversations] = useState<NostrConversation[]>([]);
  const [connected, setConnected] = useState(false);
  const [myPubkey, setMyPubkey] = useState("");
  const poolRef = useRef<SimplePool | null>(null);
  const skRef = useRef<Uint8Array | null>(null);
  const myPkRef = useRef("");
  const identifierRef = useRef(identifier);

  useEffect(() => {
    if (!identifier || typeof window === "undefined") return;
    identifierRef.current = identifier;
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const { sk, pk } = await getOrCreateKeypair(identifier);
        skRef.current = sk;
        myPkRef.current = pk;
        setMyPubkey(pk);

        // Restore persisted conversations
        const stored = localStorage.getItem(`nostr_convs_${identifier}`);
        if (stored) {
          try {
            const parsed: any[] = JSON.parse(stored);
            setConversations(
              parsed.map((c) => ({
                ...c,
                lastMessageTime: new Date(c.lastMessageTime),
                messages: c.messages.map((m: any) => ({
                  ...m,
                  timestamp: new Date(m.timestamp),
                })),
              }))
            );
          } catch {}
        }

        const pool = new SimplePool();
        poolRef.current = pool;

        // Subscribe: 30 days back
        const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

        unsubscribe = subscribeDMs(pool, pk, since, async (event: any) => {
          const sk = skRef.current;
          if (!sk) return;

          const isOwn = event.pubkey === myPkRef.current;
          const counterpartPk = isOwn
            ? (event.tags.find((t: string[]) => t[0] === "p")?.[1] ?? "")
            : event.pubkey;

          if (!counterpartPk) return;

          let decrypted: string;
          try {
            decrypted = await decryptDM(sk, counterpartPk, event.content);
          } catch {
            return; // Not for us or can't decrypt
          }

          // Parse optional "[Company via PoWR]\n\nMessage" prefix
          const powrMatch = decrypted.match(/^\[(.+?) via PoWR\]\n\n([\s\S]*)$/);
          const senderName = powrMatch ? powrMatch[1] : `${counterpartPk.slice(0, 8)}...`;
          const messageText = powrMatch ? powrMatch[2] : decrypted;

          const message: NostrMessage = {
            id: event.id,
            sender: isOwn
              ? identifierRef.current
              : senderName,
            senderId: isOwn ? myPkRef.current : counterpartPk,
            text: messageText,
            timestamp: new Date(event.created_at * 1000),
            isOwn,
          };

          setConversations((prev) => {
            const existing = prev.find(
              (c) => c.recipientPubkey === counterpartPk
            );
            let updated: NostrConversation[];

            if (existing) {
              if (existing.messages.some((m) => m.id === event.id)) return prev;
              // Update conversation name if we now have a better one
              const updatedName = (!isOwn && senderName !== `${counterpartPk.slice(0, 8)}...`)
                ? senderName : existing.name;
              updated = prev.map((c) =>
                c.recipientPubkey === counterpartPk
                  ? {
                      ...c,
                      name: updatedName,
                      messages: [...c.messages, message].sort(
                        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                      ),
                      lastMessage: messageText,
                      lastMessageTime: message.timestamp,
                      unread: c.unread + (isOwn ? 0 : 1),
                    }
                  : c
              );
            } else {
              const newConv: NostrConversation = {
                id: counterpartPk,
                name: isOwn ? `${counterpartPk.slice(0, 8)}...` : senderName,
                recipientPubkey: counterpartPk,
                lastMessage: messageText,
                lastMessageTime: message.timestamp,
                unread: isOwn ? 0 : 1,
                messages: [message],
              };
              updated = [newConv, ...prev];
              if (!isOwn) {
                toast.success(`New message from ${senderName}`);
              }
            }

            try {
              localStorage.setItem(
                `nostr_convs_${identifierRef.current}`,
                JSON.stringify(updated)
              );
            } catch {}
            return updated;
          });

          setConnected(true);
        });

        setConnected(true);
      } catch (err) {
        console.warn("[useNostr] init failed:", err);
        setConnected(false);
      }
    };

    init();

    return () => {
      unsubscribe?.();
      poolRef.current?.close(RELAYS);
      poolRef.current = null;
    };
  }, [identifier]);

  const sendMessage = useCallback(
    async (recipientPubkey: string, text: string) => {
      if (!poolRef.current || !skRef.current) throw new Error("Not connected");
      await sendDM(skRef.current, recipientPubkey, text, poolRef.current);
      // Optimistically add outgoing message
      const message: NostrMessage = {
        id: `local-${Date.now()}`,
        sender: identifierRef.current,
        senderId: myPkRef.current,
        text,
        timestamp: new Date(),
        isOwn: true,
      };
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.recipientPubkey === recipientPubkey
            ? {
                ...c,
                messages: [...c.messages, message],
                lastMessage: text,
                lastMessageTime: message.timestamp,
              }
            : c
        );
        try {
          localStorage.setItem(
            `nostr_convs_${identifierRef.current}`,
            JSON.stringify(updated)
          );
        } catch {}
        return updated;
      });
    },
    []
  );

  const openConversation = useCallback(
    (pubkey: string, name?: string) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.recipientPubkey === pubkey);
        if (existing) return prev;
        const newConv: NostrConversation = {
          id: pubkey,
          name: name || `${pubkey.slice(0, 8)}...`,
          recipientPubkey: pubkey,
          lastMessage: "",
          lastMessageTime: new Date(),
          unread: 0,
          messages: [],
        };
        const updated = [newConv, ...prev];
        try {
          localStorage.setItem(
            `nostr_convs_${identifierRef.current}`,
            JSON.stringify(updated)
          );
        } catch {}
        return updated;
      });
    },
    []
  );

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unread: 0 } : c
      )
    );
  }, []);

  return { conversations, sendMessage, connected, myPubkey, openConversation, markRead };
}
