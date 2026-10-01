import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useSimulation } from '../sim/useSimulation.js';
import TopologyCanvas from '../sim/TopologyCanvas.jsx';
import LiveChart from '../sim/LiveChart.jsx';
import ControlPanel from '../sim/ControlPanel.jsx';
import StatsPanel from '../sim/StatsPanel.jsx';
import EventLog from '../sim/EventLog.jsx';
import CompareView from '../sim/CompareView.jsx';
import QuickStart, { loadQuickstart, saveQuickstartDismissed, clearQuickstartDismissed } from '../sim/QuickStart.jsx';
import { Hint } from '../sim/InfoTip.jsx';
import { InfoTip } from '../sim/InfoTip.jsx';
import { HELP } from '../sim/help.js';
import { AnimatedNumber, Icon } from '../sim/ui.jsx';
import { useQuiz } from '../components/QuizContext.jsx';
import './Simulator.css';

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

/** One plain-English sentence describing the current state. */
export function narrationFor(snapshot, config) {
  const tick = snapshot.tick;
  const q = snapshot.queueLength;
  const buf = Math.max(1, snapshot.bufferSize);
  const pct = Math.round((q / buf) * 100);
  const hist = snapshot.history || [];
  const last = hist[hist.length - 1];
  const lostStep = last?.dropped ?? 0;
  const algo = config.algorithm;

  if (algo === 'choke') {
    const evts = snapshot.events || [];
    const recent = [...evts].reverse().find((e) => e.type === 'choke' && tick - e.tick <= 4);
    if (recent) {
      const m = /S(\d)/.exec(recent.text || '');
      const who = m ? `S${m[1]}` : 'a source';
      return `t = ${tick} — R1 sent a choke message to ${who}; ${who} is now sending more slowly.`;
    }
  }
  if (algo === 'leaky') {
    const r = config.params?.leaky?.leakRate;
    return `t = ${tick} — The bucket releases packets at a steady ${r} per step. R1 queue is ${pct}% full.`;
  }
  if (lostStep > 0) {
    return `t = ${tick} — R1 queue is ${pct}% full. ${lostStep} packet${lostStep === 1 ? ' was' : 's were'} lost this step.`;
  }
  return `t = ${tick} — R1 queue is ${pct}% full. No packets lost this step.`;
}

function MobileRunBar({ running, toggle, stepOnce, reset, injectBurst }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="runbar" role="toolbar" aria-label="Playback controls">
      <Hint tip={running ? HELP.pause : HELP.play} thing={running ? 'pause' : 'play'}>
        <button type="button" className="btn runbar-main" onClick={toggle} aria-pressed={running}>
          <Icon name={running ? 'pause' : 'play'} />
          <span>{running ? 'Pause' : 'Play'}</span>
        </button>
      </Hint>
      <Hint tip={HELP.step} thing="step">
        <button type="button" className="btn-ghost runbar-icon" onClick={stepOnce} aria-label="Step one tick"><Icon name="step" size={16} /></button>
      </Hint>
      <Hint tip={HELP.reset} thing="reset">
        <button type="button" className="btn-ghost runbar-icon" onClick={reset} aria-label="Reset"><Icon name="reset" size={16} /></button>
      </Hint>
      <Hint tip={HELP.burst} thing="inject burst">
        <button type="button" className="btn-ghost runbar-icon runbar-burst" onClick={() => injectBurst()} aria-label="Inject burst"><Icon name="bolt" size={16} /></button>
      </Hint>
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
  useShortcuts(sim);
  const [guideOpen, setGuideOpen] = useState(loadQuickstart);
  const [moreCharts, setMoreCharts] = useState(false);

  const closeGuide = () => {
    saveQuickstartDismissed();
    setGuideOpen(false);
  };
  const reopenGuide = () => {
    clearQuickstartDismissed();
    setGuideOpen(true);
  };
  const startWithNone = () => {
    sim.setConfig({ algorithm: 'none' });
    saveQuickstartDismissed();
    setGuideOpen(false);
    sim.play();
  };

  const hist = snapshot.history || [];
  const q = hist.map((h) => h.queue);
  const deliv = hist.map((h) => h.throughput);
  const offered = hist.map((h) => h.offered);
  const dropped = hist.map((h) => h.dropped);

  const queueRefs = [{ value: config.bufferSize, label: 'buffer full', color: '--ink-dim' }];
  if (config.algorithm === 'red') {
    queueRefs.push(
      { value: config.params.red.minTh, label: 'RED starts dropping', color: '--warn' },
      { value: config.params.red.maxTh, label: 'RED drops everything', color: '--drop' },
    );
  }
  const queueSeries = [{ label: 'Queue', color: '--flow', values: q, area: true }];

  const narration = narrationFor(snapshot, config);

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
              <button type="button" className="guide-link" onClick={reopenGuide}>How to use</button>
              <button type="button" className="btn-ghost quiz-btn" onClick={openQuiz}>Take the quiz</button>
            </div>
          </motion.header>

          {guideOpen && <QuickStart onClose={closeGuide} onStart={startWithNone} />}

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
                    key={narration}
                    className="info-text narration"
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {narration}
                  </motion.p>
                </AnimatePresence>
                <Counters snapshot={snapshot} />
              </div>
              <div className="canvas-legend" aria-label="Diagram legend">
                <span className="lg"><i className="dot dot-flow" /> packet</span>
                <span className="lg"><i className="dot dot-drop" /> lost packet</span>
                <span className="lg"><i className="dia" /> choke message</span>
                {config.algorithm === 'token' && <span className="lg"><i className="dot dot-token" /> token</span>}
              </div>
            </motion.section>

            <motion.section className="sim-charts" aria-label="Live charts" {...rise(3)}>
              <div className="charts-grid charts-single">
              <LiveChart
                title="Router queue over time"
                tip={<InfoTip tip={HELP.chartQueue} thing="router queue chart" />}
                series={queueSeries}
                yMax={Math.max(config.bufferSize, 1)}
                refs={queueRefs}
                endTick={snapshot.tick}
                decimals={0}
              />
              </div>
              <p className="chart-cap">When the line touches the dashed top line, the router is full and packets are lost.</p>
              <button type="button" className="chart-toggle" onClick={() => setMoreCharts((v) => !v)} aria-expanded={moreCharts}>
                {moreCharts ? 'Hide more charts' : 'Show more charts'}
              </button>
              {moreCharts && (
              <div className="charts-grid charts-extra">
              <LiveChart
                title="Packets per step"
                tip={<InfoTip tip={HELP.chartPackets} thing="packets per step chart" />}
                series={[
                  { label: 'Delivered', color: '--flow', values: deliv, area: true },
                  { label: 'Arriving', color: '--ink-dim', values: offered, width: 1.2 },
                  { label: 'Lost', color: '--drop', values: dropped, width: 1.2 },
                ]}
                refs={[{ value: config.linkCapacity, label: 'Link capacity', color: '--warn', legend: 'Link capacity' }]}
                endTick={snapshot.tick}
                decimals={0}
              />
              </div>
              )}
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
