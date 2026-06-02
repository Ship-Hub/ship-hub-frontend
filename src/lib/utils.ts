import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const CATEGORIES = [
  { value: 'prompt', label: 'PROMPT' },
  { value: 'workflow', label: 'WORKFLOW' },
  { value: 'architecture', label: 'ARCHITECTURE' },
  { value: 'template', label: 'TEMPLATE' },
  { value: 'tutorial', label: 'TUTORIAL' },
  { value: 'agent_setup', label: 'AGENT_SETUP' },
  { value: 'mcp', label: 'MCP' },
  { value: 'deployment', label: 'DEPLOYMENT' },
  { value: 'productivity', label: 'PRODUCTIVITY' },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  launched: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  archived: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

// Pre-process markdown content: auto-link @mentions and #hashtags
// Skips content inside code fences and inline code
export function processContent(content: string): string {
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts.map((part, i) => {
    if (i % 2 !== 0) return part; // inside code — skip
    return part
      .replace(/@([a-zA-Z0-9_-]+)/g, '[@$1](/u/$1)')
      .replace(/#([a-zA-Z0-9_-]+)/g, '[#$1](/browse?tag=$1)');
  }).join('');
}

export const CATEGORY_COLORS: Record<string, string> = {
  prompt: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  workflow: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  architecture: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  template: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  tutorial: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  agent_setup: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  mcp: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  deployment: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  productivity: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
};
