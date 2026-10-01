import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './InfoTip.css';

function useDismiss(open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onDown = (e) => {
      if (e.target?.closest?.('[data-tip-root]') == null) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);
}

function placeBubble(rootRef, bubbleRef, setFlip, setShift) {
  const root = rootRef.current;
  const bubble = bubbleRef.current;
  if (!root || !bubble) return;
  const r = root.getBoundingClientRect();
  const b = bubble.getBoundingClientRect();
  // Flip below when there is no room above.
  setFlip(r.top < b.height + 40);
  // Keep inside the viewport horizontally.
  let dx = 0;
  if (b.left < 8) dx = 8 - b.left;
  else if (b.right > window.innerWidth - 8) dx = window.innerWidth - 8 - b.right;
  setShift(dx);
}

export function TipBubble({ text, labelledBy, flip, shift, innerRef }) {
  return (
    <span
      ref={innerRef}
      role="tooltip"
      id={labelledBy}
      className={`tip-bubble${flip ? ' below' : ''}`}
      style={shift ? { marginLeft: `${shift}px` } : undefined}
    >
      <span className="tip-text">{text}</span>
    </span>
  );
}

/** Small circular "i" button with an accessible tooltip bubble. */
export function InfoTip({ tip, thing = 'this', side }) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const id = useId();
  const close = () => setOpen(false);

  useDismiss(open, close);
  useLayoutEffect(() => {
    if (open) placeBubble(rootRef, bubbleRef, setFlip, setShift);
  }, [open, tip]);

  const openIt = () => setOpen(true);
  void side;

  return (
    <span ref={rootRef} className="infotip" data-tip-root data-open={open ? '1' : '0'}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`What is ${thing}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={openIt}
        onMouseLeave={close}
        onFocus={openIt}
        onBlur={close}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && <TipBubble text={tip} labelledBy={id} flip={flip} shift={shift} innerRef={bubbleRef} />}
    </span>
  );
}

/**
 * Hover/focus wrapper that shows the same tooltip bubble after ~300ms.
 * Never uses the native title attribute. Works on touch via tap.
 */
export function Hint({ tip, thing = 'this', children, delay = 300 }) {
  const [open, setOpen] = useState(false);
  const [flip, setFlip] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const timer = useRef(0);
  const id = useId();
  const close = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  useDismiss(open, close);
  useLayoutEffect(() => {
    if (open) placeBubble(rootRef, bubbleRef, setFlip, setShift);
  }, [open, tip]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };

  return (
    <span
      ref={rootRef}
      className="hint"
      data-tip-root
      aria-describedby={open ? id : undefined}
      onMouseEnter={schedule}
      onMouseLeave={close}
      onFocusCapture={schedule}
      onBlurCapture={close}
      onClick={() => setOpen((v) => !v)}
    >
      {children}
      {open && tip && <TipBubble text={tip} labelledBy={id} flip={flip} shift={shift} innerRef={bubbleRef} />}
    </span>
  );
}

export default InfoTip;
