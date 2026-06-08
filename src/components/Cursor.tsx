import { useEffect, useRef, useState } from 'react';

type CursorState = 'default' | 'pointer' | 'text';

function isTouchDevice() {
  return !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function Cursor() {
  const dotRef    = useRef<HTMLDivElement>(null);
  const ringRef   = useRef<HTMLDivElement>(null);
  const spotRef   = useRef<HTMLDivElement>(null);
  const stateRef  = useRef<CursorState>('default');
  const targetRef = useRef<Element | null>(null);
  const mouseRef  = useRef({ x: -300, y: -300 });

  const [stateUI,  setStateUI]  = useState<CursorState>('default');
  const [visible,  setVisible]  = useState(false);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (isTouchDevice()) return;

    // Hide native cursor immediately
    document.documentElement.style.cursor = 'none';

    let ring = { x: -300, y: -300 };
    let spot = { x: -300, y: -300 };
    let rafId: number;

    const RING_LERP   = 0.11;
    const SPOT_LERP   = 0.055;
    const MAG_RADIUS  = 58;
    const MAG_PULL    = 0.20;

    /** Move dot instantly — no lerp, must feel precise */
    const moveDot = (x: number, y: number) => {
      const el = dotRef.current;
      if (!el) return;
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
    };

    /** RAF loop — lerp ring + spot, magnetic pull for ring */
    const tick = () => {
      const { x: mx, y: my } = mouseRef.current;

      // Magnetic pull: ring is gently attracted to centre of hovered button
      let tx = mx, ty = my;
      if (stateRef.current === 'pointer' && targetRef.current) {
        const r = targetRef.current.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const dist = Math.hypot(cx - mx, cy - my);
        if (dist < MAG_RADIUS && dist > 0) {
          const pull = MAG_PULL * (1 - dist / MAG_RADIUS);
          tx = mx + (cx - mx) * pull;
          ty = my + (cy - my) * pull;
        }
      }

      ring.x += (tx - ring.x) * RING_LERP;
      ring.y += (ty - ring.y) * RING_LERP;
      spot.x += (mx - spot.x) * SPOT_LERP;
      spot.y += (my - spot.y) * SPOT_LERP;

      const re = ringRef.current;
      if (re) { re.style.left = `${ring.x}px`; re.style.top = `${ring.y}px`; }

      const se = spotRef.current;
      if (se) { se.style.left = `${spot.x}px`; se.style.top = `${spot.y}px`; }

      rafId = requestAnimationFrame(tick);
    };

    const detectState = (x: number, y: number): CursorState => {
      const el = document.elementFromPoint(x, y);
      if (!el) return 'default';

      if (el.closest('input, textarea, [contenteditable="true"]')) {
        targetRef.current = el;
        return 'text';
      }

      const btn = el.closest(
        'a, button, [role="button"], select, label[for], summary, [data-cursor="pointer"]'
      );
      if (btn) { targetRef.current = btn; return 'pointer'; }

      const cs = window.getComputedStyle(el);
      if (cs.cursor === 'pointer') { targetRef.current = el; return 'pointer'; }
      if (cs.cursor === 'text')    { targetRef.current = el; return 'text'; }

      targetRef.current = null;
      return 'default';
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      moveDot(e.clientX, e.clientY);
      const s = detectState(e.clientX, e.clientY);
      if (s !== stateRef.current) { stateRef.current = s; setStateUI(s); }
    };

    const onDown  = () => setClicking(true);
    const onUp    = () => setClicking(false);
    const onEnter = () => setVisible(true);
    const onLeave = () => { setVisible(false); setClicking(false); };

    document.addEventListener('mousemove',  onMove,  { passive: true });
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.documentElement.style.cursor = '';
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mousedown',  onDown);
      document.removeEventListener('mouseup',    onUp);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (typeof window !== 'undefined' && isTouchDevice()) return null;

  const ck = clicking ? ' cursor-clicking' : '';

  return (
    <>
      {/* Ambient spotlight — very faint, slowest follow */}
      <div
        ref={spotRef}
        className="cursor-spot"
        style={{ opacity: visible ? 1 : 0 }}
      />
      {/* Ring — trails with lerp + magnetic pull */}
      <div
        ref={ringRef}
        className={`cursor-ring cursor-ring-${stateUI}${ck}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
      {/* Dot — precise, instant follow */}
      <div
        ref={dotRef}
        className={`cursor-dot cursor-dot-${stateUI}${ck}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
    </>
  );
}
