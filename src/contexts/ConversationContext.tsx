'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Conversation, Message, ReplacementMapping } from '@/types';
import * as storage from '@/lib/storage';

interface ConversationContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  createNewConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  updateReplacementMapping: (mapping: ReplacementMapping) => void;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, _setCurrentId] = useState<string | null>(null);

  // Keep a ref in sync so callbacks always read the latest value
  // without needing currentId in their dependency arrays.
  const currentIdRef = useRef<string | null>(null);

  const setCurrentId = useCallback((id: string | null) => {
    currentIdRef.current = id;
    _setCurrentId(id);
  }, []);

  useEffect(() => {
    const saved = storage.getConversations();
    const savedId = storage.getCurrentConversationId();
    const validId = savedId && saved.some((c) => c.id === savedId) ? savedId : saved[0]?.id ?? null;
    setConversations(saved);
    setCurrentId(validId);
  }, [setCurrentId]);

  const currentConversation = conversations.find((c) => c.id === currentId) ?? null;

  /** Persist only conversations that have at least one message (no empty new chats in history). */
  const persist = useCallback((convs: Conversation[], id: string | null) => {
    const toSave = convs.filter((c) => c.messages.length > 0);
    const validId = id && toSave.some((c) => c.id === id) ? id : toSave[0]?.id ?? null;
    storage.saveConversations(toSave);
    storage.saveCurrentConversationId(validId);
  }, []);

  /**
   * Start a fresh chat session.
   *
   * We don't create an empty conversation object here – instead we clear the
   * current selection. The first message added will automatically create and
   * persist a new conversation via `addMessage`, so there is never a "dangling"
   * empty conversation left in the history list.
   */
  const createNewConversation = useCallback(() => {
    setCurrentId(null);
    return '';
  }, [setCurrentId]);

  const selectConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const current = prev.find((c) => c.id === currentIdRef.current);
        const leavingEmpty = current && current.messages.length === 0 && id !== current.id;
        const next = leavingEmpty ? prev.filter((c) => c.id !== current.id) : prev;
        const nextId = next.some((c) => c.id === id) ? id : next[0]?.id ?? null;
        setCurrentId(nextId);
        persist(next, nextId);
        return next;
      });
    },
    [persist, setCurrentId]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const cid = currentIdRef.current;
        const next = prev.filter((c) => c.id !== id);
        const nextId = cid === id ? (next[0]?.id ?? null) : cid;
        setCurrentId(nextId);
        persist(next, nextId);
        return next;
      });
    },
    [persist, setCurrentId]
  );

  const addMessage = useCallback(
    (message: Message) => {
      setConversations((prev) => {
        let targetId = currentIdRef.current;
        let list = [...prev];

        if (!targetId) {
          const newConv: Conversation = {
            id: storage.generateId(),
            title: 'New Conversation',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            replacementMappings: {},
          };
          list = [newConv, ...list];
          targetId = newConv.id;
          setCurrentId(targetId);
        }

        const updated = list.map((conv) => {
          if (conv.id !== targetId) return conv;
          const msgs = [...conv.messages, message];
          const title =
            conv.messages.length === 0 && message.role === 'user'
              ? message.content.slice(0, 60) + (message.content.length > 60 ? '...' : '')
              : conv.title;
          return { ...conv, messages: msgs, title, updatedAt: Date.now() };
        });

        persist(updated, targetId);
        return updated;
      });
    },
    [persist, setCurrentId]
  );

  const updateReplacementMapping = useCallback(
    (mapping: ReplacementMapping) => {
      const cid = currentIdRef.current;
      if (!cid) return;
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id !== cid) return conv;
          return {
            ...conv,
            replacementMappings: { ...conv.replacementMappings, ...mapping },
          };
        });
        storage.saveConversations(updated);
        return updated;
      });
    },
    []
  );

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        currentConversation,
        createNewConversation,
        selectConversation,
        deleteConversation,
        addMessage,
        updateReplacementMapping,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversations must be used within ConversationProvider');
  return ctx;
}
