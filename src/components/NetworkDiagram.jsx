/* Campus network diagram. The same layout is rendered live (CSS variables) and exported
   to public/network-diagram.svg with hard-coded colours (generated from this component with react-dom/server). */

export const VIEW_W = 1100
export const VIEW_H = 560

const LAN_Y = [20, 190, 360]
const LAN_LABELS = [
  { name: 'CS Lab', net: '192.168.10.0/24 (40 hosts)' },
  { name: 'Admin office', net: '192.168.20.0/24 (15 hosts)' },
  { name: 'Library', net: '192.168.30.0/24 (20 hosts)' },
]
const SWITCHES = ['SW1', 'SW2', 'SW3']
const IFACES = ['Gi0/0', 'Gi0/1', 'Gi0/2']
const MID = 255
const R1 = { x: 580, y: MID }
const R2 = { x: 840, y: MID }
const SERVER = { x: 960, y: 222, w: 124, h: 66 }

export const CSS_PALETTE = {
  bg: 'var(--bg)',
  panel: 'var(--bg-2)',
  ink: 'var(--ink)',
  dim: 'var(--ink-dim)',
  faint: 'var(--ink-faint)',
  line: 'var(--line-strong)',
  flow: 'var(--flow)',
  warn: 'var(--warn)',
}

export const CSS_FONT = 'var(--font-mono)'

/* y of the two small labels beside a switch-to-R1 link; flat links get both labels above the line. */
function labelY(y, n) {
  const mid = (y + 65 + R1.y) / 2
  if (Math.abs(y + 65 - R1.y) < 20) return R1.y - 22 + n * 14
  return n === 0 ? Math.min(y + 58, mid - 6) : Math.min(y + 72, mid + 8)
}

function PcGlyph({ x, y, c }) {
  return (
    <g stroke={c.ink} strokeWidth="1.4" fill="none">
      <rect x={x} y={y} width="26" height="18" rx="2" />
      <line x1={x + 13} y1={y + 18} x2={x + 13} y2={y + 24} />
      <line x1={x + 6} y1={y + 24} x2={x + 20} y2={y + 24} />
    </g>
  )
}

function Router({ x, y, r, c }) {
  const k = r === 34 ? 18 : 14
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={c.panel} stroke={c.ink} strokeWidth="2" />
      <g stroke={c.flow} strokeWidth="1.8" fill="none" strokeLinecap="round">
        <circle cx={x} cy={y} r={k} />
        <path d={`M${x - k} ${y} h${2 * k} M${x} ${y - k} v${2 * k}`} />
      </g>
    </g>
  )
}

/* Pure SVG content. `c` is a palette, `font` the font-family for all text. */
export function DiagramSvg({ c = CSS_PALETTE, font = CSS_FONT, props = {} }) {
  const t = { fontFamily: font, style: { fontFamily: font } }
  const wanX1 = R1.x + 34
  const wanX2 = R2.x - 28
  const wanMid = (wanX1 + wanX2) / 2
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Campus network: three LANs connect through access switches to gateway router R1, which reaches router R2 and the data-centre server over a 10 megabit bottleneck WAN link" {...props}>
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={c.bg} />
      {LAN_Y.map((y, i) => (
        <g key={LAN_LABELS[i].name}>
          <rect x="20" y={y} width="250" height="130" fill="none" stroke={c.dim} strokeWidth="1.2" strokeDasharray="6 4" rx="8" />
          <PcGlyph x={36} y={y + 52} c={c} />
          <PcGlyph x={72} y={y + 52} c={c} />
          <PcGlyph x={108} y={y + 52} c={c} />
          <text x={144} y={y + 68} fill={c.dim} fontSize="14" {...t}>…</text>
          <text x={32} y={y + 22} fill={c.ink} fontSize="14" {...t}>{LAN_LABELS[i].name}</text>
          <text x={32} y={y + 106} fill={c.dim} fontSize="12" {...t}>{LAN_LABELS[i].net}</text>
          <line x1="270" y1={y + 65} x2="318" y2={y + 65} stroke={c.flow} strokeWidth="2" />
          {/* access switch */}
          <g>
            <rect x="318" y={y + 51} width="74" height="28" rx="3" fill={c.panel} stroke={c.ink} strokeWidth="1.5" />
            {[0, 1, 2, 3].map((p) => (
              <line key={p} x1={328 + p * 16} y1={y + 51} x2={328 + p * 16} y2={y + 58} stroke={c.ink} strokeWidth="1.5" />
            ))}
            <text x={322} y={y + 94} fill={c.ink} fontSize="12" {...t}>{SWITCHES[i]}</text>
          </g>
          {/* switch to R1 */}
          <line x1="392" y1={y + 65} x2={R1.x - 34} y2={R1.y} stroke={c.flow} strokeWidth="2" />
          <text x="404" y={labelY(y, 0)} fill={c.dim} fontSize="12" {...t}>100 Mbps</text>
          <text x="404" y={labelY(y, 1)} fill={c.dim} fontSize="12" {...t}>{IFACES[i]}</text>
        </g>
      ))}

      {/* R1 with its output buffer drawn above it */}
      <Router x={R1.x} y={R1.y} r={34} c={c} />
      <g>
        <text x={R1.x} y="128" fill={c.dim} fontSize="13" textAnchor="middle" {...t}>Output queue (buffer)</text>
        {[0, 1, 2, 3].map((s) => (
          <rect key={s} x={R1.x - 16} y={142 + s * 16} width="32" height="12" rx="2" fill={s > 1 ? c.flow : c.warn} stroke={c.dim} strokeWidth="0.8" />
        ))}
        <line x1={R1.x} y1="206" x2={R1.x} y2={R1.y - 34} stroke={c.dim} strokeWidth="1.2" strokeDasharray="3 3" />
      </g>
      <text x={R1.x} y={R1.y + 58} fill={c.ink} fontSize="14" textAnchor="middle" {...t}>R1 gateway</text>
      <text x={R1.x} y={R1.y + 74} fill={c.dim} fontSize="11" textAnchor="middle" {...t}>congestion control module</text>

      {/* bottleneck WAN */}
      <line x1={wanX1} y1={R1.y} x2={wanX2} y2={R1.y} stroke={c.warn} strokeWidth="4" />
      <text x={wanMid} y={R1.y - 22} fill={c.ink} fontSize="13" textAnchor="middle" {...t}>10 Mbps WAN — bottleneck</text>
      <text x={wanMid} y={R1.y + 26} fill={c.dim} fontSize="12" textAnchor="middle" {...t}>R1 Se0/0/0 10.0.0.1/30</text>
      <text x={wanMid} y={R1.y + 41} fill={c.dim} fontSize="12" textAnchor="middle" {...t}>R2 Se0/0/0 10.0.0.2/30</text>

      {/* R2 */}
      <Router x={R2.x} y={R2.y} r={28} c={c} />
      <text x={R2.x} y={R2.y + 52} fill={c.ink} fontSize="14" textAnchor="middle" {...t}>R2</text>

      {/* server + internet */}
      <line x1={R2.x + 28} y1={R2.y} x2={SERVER.x} y2={R2.y} stroke={c.flow} strokeWidth="2" />
      <text x={(R2.x + 28 + SERVER.x) / 2} y={R2.y - 12} fill={c.dim} fontSize="12" textAnchor="middle" {...t}>1 Gbps</text>
      <rect x={SERVER.x} y={SERVER.y} width={SERVER.w} height={SERVER.h} rx="4" fill={c.panel} stroke={c.ink} strokeWidth="1.5" />
      <text x={SERVER.x + SERVER.w / 2} y={SERVER.y + 28} fill={c.ink} fontSize="13" textAnchor="middle" {...t}>Data-centre</text>
      <text x={SERVER.x + SERVER.w / 2} y={SERVER.y + 43} fill={c.ink} fontSize="13" textAnchor="middle" {...t}>server</text>
      <text x={SERVER.x + SERVER.w / 2} y={SERVER.y + SERVER.h + 18} fill={c.dim} fontSize="12" textAnchor="middle" {...t}>172.16.0.10</text>
      <g>
        <ellipse cx="1010" cy="130" rx="60" ry="26" fill="none" stroke={c.dim} strokeWidth="1.4" strokeDasharray="5 3" />
        <text x="1010" y="134" fill={c.dim} fontSize="13" textAnchor="middle" {...t}>Internet</text>
        <line x1={R2.x + 22} y1={R2.y - 20} x2="962" y2="146" stroke={c.dim} strokeWidth="1.2" strokeDasharray="5 3" />
      </g>

      {/* legend */}
      <g>
        <rect x="300" y="502" width="780" height="46" fill="none" stroke={c.line} strokeWidth="1" rx="6" />
        <line x1="320" y1="525" x2="352" y2="525" stroke={c.flow} strokeWidth="2" />
        <text x="360" y="529" fill={c.dim} fontSize="12" {...t}>LAN 100 Mbps</text>
        <line x1="490" y1="525" x2="522" y2="525" stroke={c.warn} strokeWidth="4" />
        <text x="530" y="529" fill={c.dim} fontSize="12" {...t}>bottleneck WAN</text>
        <line x1="680" y1="525" x2="712" y2="525" stroke={c.dim} strokeWidth="1.2" strokeDasharray="5 3" />
        <text x="720" y="529" fill={c.dim} fontSize="12" {...t}>LAN boundary</text>
        <rect x="860" y="517" width="14" height="16" rx="2" fill="none" stroke={c.dim} strokeWidth="1" />
        <rect x="861.5" y="525" width="11" height="7" fill={c.flow} />
        <text x="882" y="529" fill={c.dim} fontSize="12" {...t}>router queue</text>
      </g>
    </svg>
  )
}

export default function NetworkDiagram() {
  return <DiagramSvg props={{ width: '100%', style: { width: '100%', height: 'auto' } }} />
}
