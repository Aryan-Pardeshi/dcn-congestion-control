import { useSimulation } from '../sim/useSimulation.js';
import TopologyCanvas from '../sim/TopologyCanvas.jsx';
import LiveChart from '../sim/LiveChart.jsx';
import ControlPanel from '../sim/ControlPanel.jsx';
import StatsPanel from '../sim/StatsPanel.jsx';
import EventLog from '../sim/EventLog.jsx';
import CompareView from '../sim/CompareView.jsx';
import { ALGORITHMS } from '../sim/algorithms/index.js';
import { useQuiz } from '../components/QuizContext.jsx';
import './Simulator.css';

const INFO = {
  none: 'Watch the buffer fill to the brim and packets drop at the tail.',
  leaky: 'Bursty arrivals enter the bucket, but packets leave toward R1 at a steady rate r.',
  token: 'Tokens accumulate while sources are quiet, so a burst up to C packets passes at once.',
  choke: 'When R1\u2019s queue crosses the threshold it sends a choke packet; the source halves its rate.',
  red: 'RED drops a few packets early as the average queue rises, keeping delay low.',
};

export default function Simulator() {
  const sim = useSimulation();
  const { snapshot, config } = sim;
  const { openQuiz } = useQuiz();
  const algo = ALGORITHMS[config.algorithm];
  const hist = snapshot.history || [];
  const q = hist.map((h) => h.queue);
  const deliv = hist.map((h) => h.throughput);
  const offered = hist.map((h) => h.offered);
  const dropped = hist.map((h) => h.dropped);

  const redRefs = [];
  if (config.algorithm === 'red') {
    redRefs.push(
      { value: config.params.red.minTh, label: 'min', color: '--warn' },
      { value: config.params.red.maxTh, label: 'max', color: '--drop' },
    );
    if (snapshot.algoState?.avg != null) {
      redRefs.push({ value: snapshot.algoState.avg, label: 'avg', color: '--token', dashed: false });
    }
  }

  return (
    <main className="sim">
      <div className="wrap">
        <header className="sim-head">
          <h1>Network congestion simulator</h1>
          <span className="sim-badge mono">{algo?.name} · {algo?.category}</span>
          <button type="button" className="btn-ghost" onClick={openQuiz}>Take the quiz</button>
        </header>

        <div className="sim-grid">
          <aside className="sim-controls" aria-label="Simulation controls">
            <ControlPanel
              config={config} setConfig={sim.setConfig} updateParam={sim.updateParam} updateSource={sim.updateSource}
              running={sim.running} toggle={sim.toggle} stepOnce={sim.stepOnce} reset={sim.reset}
              speed={sim.speed} setSpeed={sim.setSpeed} injectBurst={sim.injectBurst}
            />
          </aside>

          <section className="sim-center" aria-label="Topology and charts">
            <TopologyCanvas simRef={sim.simRef} snapshot={snapshot} />
            <p className="sim-info">{INFO[config.algorithm]}</p>
            <div className="sim-charts">
              <LiveChart
                title="Queue length"
                series={[{ label: 'queue', color: '--flow', values: q }]}
                yMax={Math.max(config.bufferSize, ...q, 1)}
                refs={[{ value: config.bufferSize, label: 'buf', color: '--ink-dim' }, ...redRefs]}
              />
              <LiveChart
                title="Throughput vs capacity"
                series={[
                  { label: 'delivered', color: '--flow', values: deliv },
                  { label: 'offered', color: '--ink-dim', values: offered },
                  { label: 'dropped', color: '--drop', values: dropped },
                ]}
                refs={[{ value: config.linkCapacity, label: 'cap', color: '--warn' }]}
              />
            </div>
          </section>

          <aside className="sim-right" aria-label="Statistics and events">
            <StatsPanel snapshot={snapshot} />
            <EventLog events={snapshot.events} />
          </aside>
        </div>

        <CompareView config={config} />
      </div>
    </main>
  );
}
