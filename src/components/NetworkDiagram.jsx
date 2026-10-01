const LAN_Y = [20, 190, 360]
const LAN_LABELS = [
  { name: 'CS Lab', net: '192.168.10.0/24 (40 hosts)' },
  { name: 'Admin office', net: '192.168.20.0/24 (15 hosts)' },
  { name: 'Library', net: '192.168.30.0/24 (20 hosts)' },
]
const SWITCHES = ['SW1', 'SW2', 'SW3']
const IFACES = ['Gi0/0', 'Gi0/1', 'Gi0/2']
const MID = 255
const R1 = { x: 540, y: MID }

function PcGlyph({ x, y }) {
  return (
    <g stroke="var(--ink)" strokeWidth="1.4" fill="none">
      <rect x={x} y={y} width="26" height="18" />
      <line x1={x + 13} y1={y + 18} x2={x + 13} y2={y + 24} />
      <line x1={x + 6} y1={y + 24} x2={x + 20} y2={y + 24} />
    </g>
  )
}

export default function NetworkDiagram() {
  return (
    <svg viewBox="0 0 960 560" width="100%" role="img" aria-label="Campus network: three LANs connect through access switches to gateway router R1, which reaches router R2 and the data-centre server over a 10 megabit bottleneck WAN link" style={{ width: '100%', height: 'auto' }}>
      {LAN_Y.map((y, i) => (
        <g key={LAN_LABELS[i].name}>
          <rect x="20" y={y} width="250" height="130" fill="none" stroke="var(--ink-dim)" strokeWidth="1.2" strokeDasharray="6 4" rx="8" />
          <PcGlyph x={36} y={y + 52} />
          <PcGlyph x={72} y={y + 52} />
          <PcGlyph x={108} y={y + 52} />
          <text x={144} y={y + 68} fill="var(--ink-dim)" fontSize="14">…</text>
          <text x={32} y={y + 22} fill="var(--ink)" fontSize="12" fontFamily="var(--font-mono)">{LAN_LABELS[i].name}</text>
          <text x={32} y={y + 106} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">{LAN_LABELS[i].net}</text>
          <line x1="270" y1={y + 65} x2="318" y2={y + 65} stroke="var(--flow)" strokeWidth="2" />
          {/* access switch */}
          <g>
            <rect x="318" y={y + 51} width="74" height="28" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
            {[0, 1, 2, 3].map((p) => (
              <line key={p} x1={328 + p * 16} y1={y + 51} x2={328 + p * 16} y2={y + 58} stroke="var(--ink)" strokeWidth="1.5" />
            ))}
            <text x={322} y={y + 94} fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">{SWITCHES[i]}</text>
          </g>
          {/* switch to R1 */}
          <line x1="392" y1={y + 65} x2={R1.x - 34} y2={R1.y} stroke="var(--flow)" strokeWidth="2" />
          <text x="404" y={Math.min(y + 58, (y + 65 + R1.y) / 2 - 6)} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">100 Mbps</text>
          <text x="404" y={Math.min(y + 72, (y + 65 + R1.y) / 2 + 8)} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">{IFACES[i]}</text>
        </g>
      ))}

      {/* R1 */}
      <circle cx={R1.x} cy={R1.y} r="34" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
      <g stroke="var(--flow)" strokeWidth="1.8" fill="none">
        <circle cx={R1.x} cy={R1.y} r="18" />
        <path d={`M${R1.x - 18} ${R1.y} h36 M${R1.x} ${R1.y - 18} v36`} />
      </g>
      <text x={R1.x - 18} y={R1.y + 52} fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">R1 gateway</text>
      <text x={R1.x - 62} y={R1.y + 66} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">congestion control module</text>
      {/* buffer icon */}
      <g>
        {[0, 1, 2, 3].map((s) => (
          <rect key={s} x="600" y={218 + s * 16} width="26" height="12" fill={s > 1 ? 'var(--flow)' : 'var(--warn)'} opacity={s > 1 ? 0.9 : 0.9} stroke="var(--ink-dim)" strokeWidth="0.8" />
        ))}
        <text x="632" y="252" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">Output queue</text>
        <text x="632" y="264" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">(buffer)</text>
      </g>

      {/* bottleneck WAN */}
      <line x1={R1.x + 34} y1={R1.y} x2="700" y2={R1.y} stroke="var(--warn)" strokeWidth="4" />
      <text x="584" y={R1.y - 12} fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">10 Mbps WAN — bottleneck</text>
      <text x="576" y={R1.y + 82} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">Se0/0/0 10.0.0.1/30</text>

      {/* R2 */}
      <circle cx="728" cy={R1.y} r="28" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
      <g stroke="var(--flow)" strokeWidth="1.6" fill="none">
        <circle cx="728" cy={R1.y} r="14" />
        <path d="M714 255 h28 M728 241 v28" />
      </g>
      <text x="718" y={R1.y + 44} fill="var(--ink)" fontSize="11" fontFamily="var(--font-mono)">R2</text>
      <text x="706" y={R1.y + 96} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">Se0/0/0 10.0.0.2/30</text>

      {/* server + internet */}
      <line x1="756" y1={R1.y} x2="826" y2={R1.y} stroke="var(--flow)" strokeWidth="2" />
      <text x="758" y={R1.y - 10} fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">1 Gbps</text>
      <rect x="826" y="222" width="114" height="66" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      <text x="834" y="244" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">Data-centre</text>
      <text x="834" y="258" fill="var(--ink)" fontSize="10" fontFamily="var(--font-mono)">server</text>
      <text x="834" y="274" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">172.16.0.10</text>
      <g>
        <ellipse cx="880" cy="150" rx="52" ry="26" fill="none" stroke="var(--ink-dim)" strokeWidth="1.4" strokeDasharray="5 3" />
        <text x="852" y="154" fill="var(--ink-dim)" fontSize="11" fontFamily="var(--font-mono)">Internet</text>
        <line x1="760" y1={R1.y - 28} x2="848" y2="168" stroke="var(--ink-dim)" strokeWidth="1.2" strokeDasharray="5 3" />
      </g>

      {/* legend */}
      <g>
        <rect x="300" y="502" width="640" height="46" fill="none" stroke="var(--line)" strokeWidth="1" rx="6" />
        <line x1="316" y1="525" x2="348" y2="525" stroke="var(--flow)" strokeWidth="2" />
        <text x="354" y="529" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">LAN 100 Mbps</text>
        <line x1="478" y1="525" x2="510" y2="525" stroke="var(--warn)" strokeWidth="4" />
        <text x="516" y="529" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">bottleneck WAN</text>
        <line x1="648" y1="525" x2="680" y2="525" stroke="var(--ink-dim)" strokeWidth="1.2" strokeDasharray="5 3" />
        <text x="686" y="529" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">LAN boundary</text>
        <rect x="800" y="517" width="14" height="16" fill="none" stroke="var(--ink-dim)" strokeWidth="1" />
        <rect x="801" y="525" width="12" height="7" fill="var(--flow)" />
        <text x="820" y="529" fill="var(--ink-dim)" fontSize="10" fontFamily="var(--font-mono)">router queue</text>
      </g>
    </svg>
  )
}
