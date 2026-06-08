import { create } from 'zustand';
import type { PostWithAuthor, MemoryWithAuthor, ProjectWithOwner } from '../lib/api';

interface ComposeState {
  quotePost: PostWithAuthor | null;
  quoteMemory: MemoryWithAuthor | null;
  quoteProject: ProjectWithOwner | null;
  setQuotePost: (p: PostWithAuthor) => void;
  setQuoteMemory: (m: MemoryWithAuthor) => void;
  setQuoteProject: (p: ProjectWithOwner) => void;
  clear: () => void;
}

export const useComposeStore = create<ComposeState>((set) => ({
  quotePost: null,
  quoteMemory: null,
  quoteProject: null,
  setQuotePost: (quotePost) => set({ quotePost, quoteMemory: null, quoteProject: null }),
  setQuoteMemory: (quoteMemory) => set({ quoteMemory, quotePost: null, quoteProject: null }),
  setQuoteProject: (quoteProject) => set({ quoteProject, quotePost: null, quoteMemory: null }),
  clear: () => set({ quotePost: null, quoteMemory: null, quoteProject: null }),
}));
