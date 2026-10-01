import './QuickStart.css';

export const QUICKSTART_KEY = 'sim-quickstart-dismissed';

export function loadQuickstart() {
  try {
    return localStorage.getItem(QUICKSTART_KEY) !== '1';
  } catch {
    return true;
  }
}

export function saveQuickstartDismissed() {
  try {
    localStorage.setItem(QUICKSTART_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function clearQuickstartDismissed() {
  try {
    localStorage.removeItem(QUICKSTART_KEY);
  } catch {
    /* storage unavailable */
  }
}

export default function QuickStart({ onClose, onStart }) {
  return (
    <section className="quick panel" aria-label="How to use the simulator">
      <div className="quick-head">
        <h2 className="quick-title">How to use the simulator</h2>
      </div>
      <ol className="quick-steps">
        <li><b>1.</b> Pick a mechanism on the left (start with No control).</li>
        <li><b>2.</b> Press Play and watch packets travel from the labs to the router.</li>
        <li><b>3.</b> Watch the router queue: when it is full, packets turn red and are lost. Then try another mechanism and compare.</li>
      </ol>
      <p className="quick-legend">
        <span className="lg"><i className="dot dot-flow" /> packet</span>
        <span className="lg"><i className="dot dot-drop" /> lost packet</span>
        <span className="lg"><i className="dia" /> choke message</span>
      </p>
      <div className="quick-actions">
        <button type="button" className="btn quick-go" onClick={onStart}>Start with No control</button>
        <button type="button" className="btn-ghost quick-ok" onClick={onClose}>Got it</button>
      </div>
    </section>
  );
}
