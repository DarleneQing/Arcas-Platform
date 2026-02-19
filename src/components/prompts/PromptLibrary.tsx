'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  BookOpen,
  Lightbulb,
  GraduationCap,
  Palette,
  PenLine,
} from 'lucide-react';
import { Prompt, PromptCategory, TabType } from '@/types';
import { getCustomPrompts, saveCustomPrompts, generateId } from '@/lib/storage';

/* ---------- Default prompt library ---------- */

const DEFAULT_PROMPTS: Prompt[] = [
  // Writing
  {
    id: 'default-1', title: 'Professional Email', description: 'Draft a professional email',
    text: 'Write a professional email about [topic]. Include a clear subject line, greeting, body, and sign-off.',
    category: 'writing', isCustom: false, liked: false, likeCount: 24, tags: ['email'], createdAt: 0,
  },
  {
    id: 'default-2', title: 'Social Media Post', description: 'Create engaging social content',
    text: 'Create an engaging social media post about [topic]. Make it attention-grabbing and include relevant hashtags.',
    category: 'writing', isCustom: false, liked: false, likeCount: 18, tags: ['social'], createdAt: 0,
  },
  {
    id: 'default-3', title: 'Blog Outline', description: 'Structure a blog post',
    text: 'Draft a detailed blog outline about [topic]. Include an introduction, main sections with key points, and a conclusion.',
    category: 'writing', isCustom: false, liked: false, likeCount: 15, tags: ['blog'], createdAt: 0,
  },
  // Productivity
  {
    id: 'default-4', title: 'Project To-Do List', description: 'Break down a project',
    text: 'Create a comprehensive to-do list for [project]. Break it down into phases with priorities and estimated time for each task.',
    category: 'productivity', isCustom: false, liked: false, likeCount: 31, tags: ['planning'], createdAt: 0,
  },
  {
    id: 'default-5', title: 'Meeting Agenda', description: 'Plan a structured meeting',
    text: 'Create a structured meeting agenda for [purpose]. Include time allocations, discussion points, and action items section.',
    category: 'productivity', isCustom: false, liked: false, likeCount: 22, tags: ['meeting'], createdAt: 0,
  },
  {
    id: 'default-6', title: 'Brainstorming', description: 'Generate creative ideas',
    text: 'Brainstorm 10 creative and unique ideas for [topic]. For each idea, provide a brief description and potential benefits.',
    category: 'productivity', isCustom: false, liked: false, likeCount: 27, tags: ['ideas'], createdAt: 0,
  },
  // Learning
  {
    id: 'default-7', title: 'Simple Explanation', description: 'Get a concept explained in simple terms',
    text: 'Explain [concept] in simple terms that a beginner could understand. Use analogies and real-world examples.',
    category: 'learning', isCustom: false, liked: false, likeCount: 35, tags: ['explain'], createdAt: 0,
  },
  {
    id: 'default-8', title: 'Step-by-Step Guide', description: 'Learn about a topic step by step',
    text: 'Teach me about [topic] step by step. Start from the basics and gradually increase complexity. Include examples at each step.',
    category: 'learning', isCustom: false, liked: false, likeCount: 28, tags: ['tutorial'], createdAt: 0,
  },
  {
    id: 'default-9', title: 'Compare & Contrast', description: 'Compare two things side by side',
    text: 'Compare and contrast [A] and [B]. Create a structured comparison covering similarities, differences, pros, and cons of each.',
    category: 'learning', isCustom: false, liked: false, likeCount: 19, tags: ['compare'], createdAt: 0,
  },
  // Creative
  {
    id: 'default-10', title: 'Story Ideas', description: 'Generate creative story concepts',
    text: 'Generate 5 unique story ideas about [theme]. For each, include a premise, main character, conflict, and potential twist.',
    category: 'creative', isCustom: false, liked: false, likeCount: 20, tags: ['story'], createdAt: 0,
  },
  {
    id: 'default-11', title: 'Creative Names', description: 'Generate creative names for projects',
    text: 'Generate 10 creative and memorable names for [business/project]. Consider the brand identity, target audience, and market positioning.',
    category: 'creative', isCustom: false, liked: false, likeCount: 16, tags: ['naming'], createdAt: 0,
  },
  {
    id: 'default-12', title: 'Motivational Message', description: 'Create an inspiring motivational message',
    text: 'Write an inspiring and uplifting motivational message about [topic]. Make it personal, relatable, and actionable.',
    category: 'creative', isCustom: false, liked: false, likeCount: 23, tags: ['motivation'], createdAt: 0,
  },
];

const CATEGORY_META: Record<PromptCategory, { label: string; icon: React.ElementType }> = {
  writing: { label: 'Writing', icon: PenLine },
  productivity: { label: 'Productivity', icon: Lightbulb },
  learning: { label: 'Learning', icon: GraduationCap },
  creative: { label: 'Creative', icon: Palette },
};

interface PromptLibraryProps {
  onUsePrompt: (text: string) => void;
}

export default function PromptLibrary({ onUsePrompt }: PromptLibraryProps) {
  const [customPrompts, setCustomPrompts] = useState<Prompt[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PromptCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Modal form state
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<PromptCategory>('writing');

  useEffect(() => {
    setCustomPrompts(getCustomPrompts());
    // Load liked IDs from localStorage
    try {
      const saved = localStorage.getItem('arcas_liked_prompts');
      if (saved) setLikedIds(new Set(JSON.parse(saved)));
    } catch { /* noop */ }
  }, []);

  const allPrompts = [...customPrompts, ...DEFAULT_PROMPTS];

  const filteredPrompts = allPrompts
    .filter((p) => {
      if (filter === 'favorites') return likedIds.has(p.id);
      if (filter === 'all') return true;
      return p.category === filter;
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.text.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Liked first, then by like count
      const aLiked = likedIds.has(a.id) ? 1 : 0;
      const bLiked = likedIds.has(b.id) ? 1 : 0;
      if (aLiked !== bLiked) return bLiked - aLiked;
      return b.likeCount - a.likeCount;
    });

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('arcas_liked_prompts', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingPrompt(null);
    setFormTitle('');
    setFormText('');
    setFormDescription('');
    setFormCategory('writing');
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormTitle(prompt.title);
    setFormText(prompt.text);
    setFormDescription(prompt.description);
    setFormCategory(prompt.category);
    setModalOpen(true);
  }, []);

  const handleSavePrompt = useCallback(() => {
    if (!formTitle.trim() || !formText.trim()) return;

    if (editingPrompt) {
      const updated = customPrompts.map((p) =>
        p.id === editingPrompt.id
          ? { ...p, title: formTitle, text: formText, description: formDescription, category: formCategory }
          : p
      );
      setCustomPrompts(updated);
      saveCustomPrompts(updated);
    } else {
      const newPrompt: Prompt = {
        id: generateId(),
        title: formTitle,
        text: formText,
        description: formDescription,
        category: formCategory,
        isCustom: true,
        liked: false,
        likeCount: 0,
        tags: [],
        createdAt: Date.now(),
      };
      const updated = [newPrompt, ...customPrompts];
      setCustomPrompts(updated);
      saveCustomPrompts(updated);
    }
    setModalOpen(false);
  }, [editingPrompt, customPrompts, formTitle, formText, formDescription, formCategory]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = customPrompts.filter((p) => p.id !== id);
      setCustomPrompts(updated);
      saveCustomPrompts(updated);
      setDeleteConfirm(null);
    },
    [customPrompts]
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Prompt Library
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Jumpstart your tasks with verified templates.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors focus-ring shrink-0 hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={16} />
            Create Prompt
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'writing', 'productivity', 'learning', 'creative', 'favorites'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-ring"
              style={{
                background: filter === cat ? 'var(--accent)' : 'transparent',
                color: filter === cat ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'All' : cat === 'favorites' ? 'Favorites' : CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        {/* Search - subtle, below filters */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-colors border border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-20"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Prompt Grid */}
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No prompts found. Try a different search or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPrompts.map((prompt) => {
              const meta = CATEGORY_META[prompt.category];
              const isLiked = likedIds.has(prompt.id);

              return (
                <div
                  key={prompt.id}
                  className="flex flex-col rounded-xl p-5 transition-all duration-150 group bg-white dark:bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--accent)]/20"
                >
                  {/* Top row: category pill (left) + favorite (right) */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                    >
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => toggleLike(prompt.id)}
                        className="p-1.5 rounded-lg transition-colors focus-ring"
                        style={{ color: isLiked ? '#EF4444' : 'var(--text-tertiary)' }}
                        title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart size={16} fill={isLiked ? '#EF4444' : 'none'} strokeWidth={1.5} />
                      </button>
                      {prompt.isCustom && (
                        <>
                          <button
                            onClick={() => openEditModal(prompt)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus-ring"
                            style={{ color: 'var(--text-tertiary)' }}
                            title="Edit prompt"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(prompt.id)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus-ring"
                            style={{ color: '#EF4444' }}
                            title="Delete prompt"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title + description */}
                  <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {prompt.title}
                  </h3>
                  <p className="text-sm flex-1 line-clamp-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {prompt.description}
                  </p>

                  {/* Use Prompt link */}
                  <button
                    onClick={() => onUsePrompt(prompt.text)}
                    className="flex items-center gap-1.5 text-sm font-medium w-fit transition-opacity hover:opacity-80 focus-ring rounded"
                    style={{ color: 'var(--accent)' }}
                  >
                    Use Prompt
                    <span aria-hidden>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg focus-ring" style={{ color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Give your prompt a name"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus-ring"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what this prompt does"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus-ring"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Prompt text
                  <span className="font-normal opacity-60 ml-1">Use [placeholder] for variables</span>
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Write your prompt here. Use [topic], [name], etc. as placeholders."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none focus-ring"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(CATEGORY_META) as PromptCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFormCategory(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus-ring"
                      style={{
                        background: formCategory === cat ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: formCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
                        border: `1px solid ${formCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      {CATEGORY_META[cat].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium focus-ring"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={!formTitle.trim() || !formText.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white focus-ring disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {editingPrompt ? 'Save Changes' : 'Create Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Delete Prompt?
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this prompt? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium focus-ring"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white focus-ring"
                style={{ background: '#EF4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
