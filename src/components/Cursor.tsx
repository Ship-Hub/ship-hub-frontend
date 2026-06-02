import { useEffect, useRef, useState } from 'react';

type CursorState = 'default' | 'pointer' | 'text';

function isTouchDevice() {
  return !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CursorState>('default');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isTouchDevice()) return;

    let ringX = -100, ringY = -100;
    let mouseX = -100, mouseY = -100;
    let rafId: number;

    const moveDot = (x: number, y: number) => {
      if (!dotRef.current) return;
      dotRef.current.style.left = `${x}px`;
      dotRef.current.style.top  = `${y}px`;
    };

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.1;
      ringY += (mouseY - ringY) * 0.1;
      if (ringRef.current) {
        ringRef.current.style.left = `${ringX}px`;
        ringRef.current.style.top  = `${ringY}px`;
      }
      rafId = requestAnimationFrame(animateRing);
    };

    const detectState = (e: MouseEvent): CursorState => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return 'default';
      if (el.closest('input, textarea, [contenteditable="true"]')) return 'text';
      if (el.closest('a, button, [role="button"], select, label[for], summary')) return 'pointer';
      const style = window.getComputedStyle(el);
      if (style.cursor === 'pointer') return 'pointer';
      if (style.cursor === 'text') return 'text';
      return 'default';
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      moveDot(mouseX, mouseY);
      setState(detectState(e));
    };

    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(animateRing);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (typeof window !== 'undefined' && isTouchDevice()) return null;

  return (
    <>
      <div
        ref={dotRef}
        className={`cursor-dot cursor-dot-${state}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={ringRef}
        className={`cursor-ring cursor-ring-${state}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
    </>
  );
}
