import { create } from 'zustand';
import type { PostWithAuthor, MemoryWithAuthor } from '../lib/api';

interface ComposeState {
  quotePost: PostWithAuthor | null;
  quoteMemory: MemoryWithAuthor | null;
  setQuotePost: (p: PostWithAuthor) => void;
  setQuoteMemory: (m: MemoryWithAuthor) => void;
  clear: () => void;
}

export const useComposeStore = create<ComposeState>((set) => ({
  quotePost: null,
  quoteMemory: null,
  setQuotePost: (quotePost) => set({ quotePost, quoteMemory: null }),
  setQuoteMemory: (quoteMemory) => set({ quoteMemory, quotePost: null }),
  clear: () => set({ quotePost: null, quoteMemory: null }),
}));
