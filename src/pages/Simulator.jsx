import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useSimulation } from '../sim/useSimulation.js';
import TopologyCanvas from '../sim/TopologyCanvas.jsx';
import LiveChart from '../sim/LiveChart.jsx';
import ControlPanel from '../sim/ControlPanel.jsx';
import StatsPanel from '../sim/StatsPanel.jsx';
import EventLog from '../sim/EventLog.jsx';
import CompareView from '../sim/CompareView.jsx';
import { AnimatedNumber, Icon, StatusPill } from '../sim/ui.jsx';
import { ALGORITHMS } from '../sim/algorithms/index.js';
import { useQuiz } from '../components/QuizContext.jsx';
import './Simulator.css';

const INFO = {
  none: 'Watch the buffer fill to the brim and packets drop at the tail.',
  leaky: 'Bursty arrivals enter the bucket, but packets leave toward R1 at a steady rate r.',
  token: 'Tokens accumulate while sources are quiet, so a burst up to C packets passes at once.',
  choke: 'When the R1 queue crosses the threshold it sends a choke packet, and the source cuts its rate.',
  red: 'RED drops a few packets early as the average queue rises, keeping delay low.',
};

const CAT_TONE = {
  Baseline: 'base',
  'Traffic shaping': 'shape',
  'Feedback congestion control': 'feedback',
  'Active queue management': 'aqm',
};

const int = (v) => Math.round(v).toLocaleString('en-US');

function useShortcuts({ toggle, stepOnce, reset, injectBurst }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.code === 'Space') {
        if (tag === 'BUTTON' || tag === 'A') return; // let the focused control handle its own activation
        e.preventDefault();
        toggle();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 's') stepOnce();
      else if (k === 'r') reset();
      else if (k === 'b') injectBurst();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, stepOnce, reset, injectBurst]);
}

function Counters({ snapshot }) {
  const algo = snapshot.algorithm;
  const d = snapshot.dropsByReason || { shape: 0, red: 0, overflow: 0 };
  const items = [];
  if (algo === 'leaky' || algo === 'token') items.push({ label: 'Shaper drops', value: d.shape, tone: '--token' });
  if (algo === 'red') items.push({ label: 'Early drops', value: d.red, tone: '--warn' });
  if (algo === 'choke') items.push({ label: 'Chokes sent', value: snapshot.algoState?.chokesSent ?? 0, tone: '--warn' });
  items.push({ label: 'Tail drops', value: d.overflow, tone: '--drop' });
  return (
    <div className="info-counters">
      {items.map((c) => (
        <span key={c.label} className="counter">
          <i style={{ background: `var(${c.tone})` }} />
          {c.label}
          <AnimatedNumber value={c.value} format={int} />
        </span>
      ))}
    </div>
  );
}

function MobileRunBar({ running, toggle, stepOnce, reset, injectBurst }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="runbar" role="toolbar" aria-label="Playback controls">
      <button type="button" className="btn runbar-main" onClick={toggle} aria-pressed={running}>
        <Icon name={running ? 'pause' : 'play'} />
        <span>{running ? 'Pause' : 'Play'}</span>
      </button>
      <button type="button" className="btn-ghost runbar-icon" onClick={stepOnce} aria-label="Step one tick"><Icon name="step" size={16} /></button>
      <button type="button" className="btn-ghost runbar-icon" onClick={reset} aria-label="Reset"><Icon name="reset" size={16} /></button>
      <button type="button" className="btn-ghost runbar-icon runbar-burst" onClick={() => injectBurst()} aria-label="Inject burst"><Icon name="bolt" size={16} /></button>
    </div>,
    document.body,
  );
}

const rise = (i) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] },
});

export default function Simulator() {
  const sim = useSimulation();
  const { snapshot, config } = sim;
  const { openQuiz } = useQuiz();
  const algo = ALGORITHMS[config.algorithm];
  useShortcuts(sim);

  const hist = snapshot.history || [];
  const q = hist.map((h) => h.queue);
  const deliv = hist.map((h) => h.throughput);
  const offered = hist.map((h) => h.offered);
  const dropped = hist.map((h) => h.dropped);

  const queueRefs = [{ value: config.bufferSize, label: `buffer ${config.bufferSize}`, color: '--ink-dim' }];
  if (config.algorithm === 'red') {
    queueRefs.push(
      { value: config.params.red.minTh, label: `min ${config.params.red.minTh}`, color: '--warn' },
      { value: config.params.red.maxTh, label: `max ${config.params.red.maxTh}`, color: '--drop' },
    );
  }
  const queueSeries = [{ label: 'queue', color: '--flow', values: q, area: true }];
  if (config.algorithm === 'red') {
    queueSeries.push({ label: 'avg (RED)', color: '--token', values: hist.map((h) => h.avgRed ?? 0), width: 1.4 });
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="sim">
        <div className="sim-shell">
          <motion.header className="sim-head" {...rise(0)}>
            <div className="sim-title">
              <h1>Network congestion simulator</h1>
              <p>Three campus labs share one gateway router and one bottleneck link to the server.</p>
            </div>
            <div className="sim-head-actions">
              <span className="pill-mech" title={algo?.short}>
                <span className="pill-mech-name">{algo?.name}</span>
                <span className={`cat cat-${CAT_TONE[algo?.category]}`}>{algo?.category}</span>
              </span>
              <StatusPill tone={sim.running ? 'flow' : 'idle'} pulse={sim.running}>
                {sim.running ? 'Running' : 'Paused'}
              </StatusPill>
              <button type="button" className="btn-ghost quiz-btn" onClick={openQuiz}>Take the quiz</button>
            </div>
          </motion.header>

          <div className="sim-grid">
            <motion.aside className="sim-controls panel" aria-label="Simulation controls" data-lenis-prevent {...rise(1)}>
              <ControlPanel
                config={config} setConfig={sim.setConfig} updateParam={sim.updateParam} updateSource={sim.updateSource}
                running={sim.running} toggle={sim.toggle} stepOnce={sim.stepOnce} reset={sim.reset}
                speed={sim.speed} setSpeed={sim.setSpeed} injectBurst={sim.injectBurst}
              />
            </motion.aside>

            <motion.section className="sim-stage" aria-label="Network topology" {...rise(2)}>
              <TopologyCanvas simRef={sim.simRef} snapshot={snapshot} />
              <div className="info">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={config.algorithm}
                    className="info-text"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {INFO[config.algorithm]}
                  </motion.p>
                </AnimatePresence>
                <Counters snapshot={snapshot} />
              </div>
            </motion.section>

            <motion.section className="sim-charts" aria-label="Live charts" {...rise(3)}>
              <div className="charts-grid">
              <LiveChart
                title="Queue length"
                hint="packets in the R1 buffer"
                series={queueSeries}
                yMax={Math.max(config.bufferSize, 1)}
                refs={queueRefs}
                endTick={snapshot.tick}
                decimals={config.algorithm === 'red' ? 1 : 0}
              />
              <LiveChart
                title="Throughput vs capacity"
                hint="packets per tick"
                series={[
                  { label: 'delivered', color: '--flow', values: deliv, area: true },
                  { label: 'offered', color: '--ink-dim', values: offered, width: 1.2 },
                  { label: 'dropped', color: '--drop', values: dropped, width: 1.2 },
                ]}
                refs={[{ value: config.linkCapacity, label: `capacity ${config.linkCapacity}`, color: '--warn', legend: 'capacity' }]}
                endTick={snapshot.tick}
                decimals={0}
              />
              </div>
            </motion.section>

            <motion.aside className="sim-side" aria-label="Statistics and events" {...rise(4)}>
              <StatsPanel snapshot={snapshot} />
              <EventLog events={snapshot.events} />
            </motion.aside>
          </div>

          <motion.div {...rise(5)}>
            <CompareView config={config} />
          </motion.div>
        </div>
        <MobileRunBar {...sim} />
      </main>
    </MotionConfig>
  );
}
