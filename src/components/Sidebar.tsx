'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  MessageSquare,
  Mail,
  Languages,
  FileText,
  BookOpen,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronsUp,
} from 'lucide-react';
import { TabType } from '@/types';
import { useConversations } from '@/contexts/ConversationContext';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'General Chat', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'translation', label: 'Translation', icon: Languages },
  { id: 'summarize', label: 'Summarize', icon: FileText },
  { id: 'prompts', label: 'Prompt Library', icon: BookOpen },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const {
    conversations,
    currentConversation,
    createNewConversation,
    selectConversation,
    deleteConversation,
  } = useConversations();

  const [showExpandedContent, setShowExpandedContent] = useState(!collapsed);
  useEffect(() => {
    if (collapsed) {
      setShowExpandedContent(false);
    } else {
      const t = setTimeout(() => setShowExpandedContent(true), 200);
      return () => clearTimeout(t);
    }
  }, [collapsed]);

  return (
    <aside
      className={`
        flex flex-col h-full transition-all duration-200 ease-in-out z-20
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
        ${collapsed ? 'w-16' : 'w-72'}
      `}
    >
      {/* Header */}
      <div className="p-4">
        {showExpandedContent && !collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src="/platform_icon.png"
                  alt="Arcas"
                  width={32}
                  height={32}
                  className="object-contain p-1"
                />
              </div>
              <h1 className="font-bold text-lg tracking-tight text-brand-700 dark:text-white uppercase">
                Arcas
              </h1>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-ring"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        ) : (
          <div className="group relative flex items-center justify-center w-8 h-8">
            <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0 transition-opacity duration-150 group-hover:opacity-0">
              <Image
                src="/platform_icon.png"
                alt="Arcas"
                width={32}
                height={32}
                className="object-contain p-1"
              />
            </div>
            <button
              onClick={onToggleCollapse}
              className="absolute inset-0 flex items-center justify-center p-1.5 rounded-lg transition-opacity duration-150 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-ring opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
              title="Expand sidebar"
            >
              <PanelLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 mt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex items-center h-[42px] rounded-xl text-sm font-medium
                transition-all duration-200 ease-in-out focus-ring
                ${collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-4'}
                ${isActive
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                <Icon size={18} />
              </span>
              <span
                className={`
                  overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out
                  ${collapsed ? 'max-w-0 opacity-0 delay-0' : 'max-w-[180px] opacity-100 delay-200'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Conversation History (only visible when chat tab is active) */}
      {activeTab === 'chat' && showExpandedContent && !collapsed && (
        <div className="flex flex-col flex-1 min-h-0 mt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Conversations
            </span>
            <button
              type="button"
              onClick={() => createNewConversation()}
              className="p-1 rounded-md transition-colors text-primary hover:text-primary/80 focus-ring"
              title="New conversation"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-2">
            {conversations.length === 0 && (
              <p className="text-xs px-2 py-4 text-center text-slate-400">
                No conversations yet
              </p>
            )}
            {conversations.map((conv) => {
              const isSelected = conv.id === currentConversation?.id;
              return (
                <div
                  key={conv.id}
                  className={`
                    group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer
                    transition-all duration-150 mb-0.5
                    ${isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-primary font-medium'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }
                  `}
                  onClick={() => selectConversation(conv.id)}
                >
                  <MessageSquare size={14} className="shrink-0 opacity-50" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity text-slate-400 hover:text-red-500 focus-ring"
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
        <UserProfileMenu collapsed={collapsed} showExpandedContent={showExpandedContent} />
      </div>
    </aside>
  );
}

function UserProfileMenu({ collapsed, showExpandedContent }: { collapsed: boolean; showExpandedContent: boolean }) {
  const [open, setOpen] = React.useState(false);
  const showFullLayout = !collapsed && showExpandedContent;

  const userName = 'Alex Johnson';
  const accountLabel = 'Pro Account';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex items-center w-full rounded-xl px-3 py-2 transition-colors focus-ring
          ${showFullLayout ? 'justify-between' : 'justify-center'}
          bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-700 to-primary flex items-center justify-center text-white">
            <UserIcon size={18} />
          </div>
          {showFullLayout && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {userName}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{accountLabel}</span>
            </div>
          )}
        </div>
        {showFullLayout && <ChevronsUp size={14} className="text-slate-400" />}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-3 w-auto min-w-[200px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/10">
          <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{userName}</p>
            <p className="text-xs text-slate-400">{accountLabel}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                // TODO: Wire up settings view when available
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>

            <div className="px-4 py-2">
              <ThemeToggle collapsed={false} />
            </div>

            <button
              type="button"
              onClick={() => {
                // TODO: Wire up logout when authentication is added
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
