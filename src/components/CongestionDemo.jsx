import { useEffect, useRef, useState } from 'react'
import './CongestionDemo.css'

/* Live canvas demo for the landing hero: three LANs feed router R1 faster than its 8 pps
   bottleneck drains. Pick a mechanism and watch the buffer, drops and feedback change.
   Visual design ported from a Google Flow prototype; engine is a small time-based sim kept in refs. */

const CONFIG = {
  MAX_BUFFER: 50,
  LINK_CAPACITY: 8, // packets / s over the bottleneck
  LEAK_RATE: 4, // leaky bucket output, packets / s
  TOKEN_RATE: 4, // tokens / s
  TOKEN_MAX: 30,
  INGRESS_RATE: 12, // total offered load, packets / s
  BURST_RATE: 0.12, // bursts / s / source
  BURST_SIZE: 12,
  CHOKE_THRESHOLD: 0.6,
  CHOKE_COOLDOWN: 0.75, // s between choke packets
  RECOVERY: 0.15, // source rate regained / s after a choke
  RED_MIN: 0.2,
  RED_MAX: 0.8,
  RED_MAX_P: 0.5,
  RED_W: 0.1,
}

const MODES = [
  { id: 'none', label: 'No control', desc: 'Packets queue until the buffer is full, then get dropped.' },
  { id: 'leaky', label: 'Leaky bucket', desc: 'Releases packets at a fixed rate, smoothing bursts at the cost of drops.' },
  { id: 'token', label: 'Token bucket', desc: 'Each packet spends a token to pass, so short bursts get through.' },
  { id: 'choke', label: 'Choke packet', desc: 'When the buffer passes 60%, R1 tells a source to slow down.' },
  { id: 'red', label: 'RED', desc: 'Randomly drops packets early, more often as the average queue grows.' },
]

const NODES = [
  { id: 'a', label: 'CS Lab', x: 0.18, y: 0.26, type: 'source' },
  { id: 'b', label: 'Admin', x: 0.18, y: 0.5, type: 'source' },
  { id: 'c', label: 'Library', x: 0.18, y: 0.74, type: 'source' },
  { id: 'router', label: 'R1', x: 0.56, y: 0.5, type: 'router' },
  { id: 'server', label: 'Server', x: 0.85, y: 0.5, type: 'sink' },
]
const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]))
const SOURCES = NODES.filter((n) => n.type === 'source')
const CELLS = 10

const COLOR_VARS = ['bg', 'bg-2', 'line', 'line-strong', 'ink', 'ink-dim', 'flow', 'warn', 'drop', 'token', 'ok']

function readTheme() {
  const cs = getComputedStyle(document.documentElement)
  const t = {}
  COLOR_VARS.forEach((k) => {
    t[k] = cs.getPropertyValue(`--${k}`).trim() || '#888'
  })
  t.mono = cs.getPropertyValue('--font-mono').trim() || 'monospace'
  return t
}

function createSim() {
  return {
    t: 0,
    packets: [],
    buffer: 0,
    particles: [],
    pending: [],
    tokens: CONFIG.TOKEN_MAX,
    avg: 0,
    rates: { a: 1, b: 1, c: 1 },
    drainAcc: 0,
    chokeCd: 0,
    sent: 0,
    dropped: 0,
    arrived: 0,
  }
}

function spawn(sim, sourceId) {
  sim.packets.push({
    from: sourceId,
    to: 'router',
    progress: 0,
    speed: 0.38 + Math.random() * 0.12,
    type: 'data',
    trail: [],
    lastTrail: 0,
  })
  sim.sent++
}

function burst(sim, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 40 + Math.random() * 110
    sim.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color })
  }
}

function step(sim, mode, dt, view) {
  sim.t += dt
  const { w, h } = view

  // Offered load: steady trickle + occasional bursts, scaled by each source's throttle.
  SOURCES.forEach((n) => {
    const rate = sim.rates[n.id]
    if (Math.random() < (CONFIG.INGRESS_RATE / 3) * rate * dt) spawn(sim, n.id)
    if (Math.random() < CONFIG.BURST_RATE * rate * dt) {
      for (let i = 0; i < CONFIG.BURST_SIZE; i++) sim.pending.push({ at: sim.t + i * 0.05, id: n.id })
    }
    if (sim.rates[n.id] < 1) sim.rates[n.id] = Math.min(1, sim.rates[n.id] + CONFIG.RECOVERY * dt)
  })
  sim.pending = sim.pending.filter((p) => {
    if (p.at > sim.t) return true
    spawn(sim, p.id)
    return false
  })

  if (mode === 'token') sim.tokens = Math.min(CONFIG.TOKEN_MAX, sim.tokens + CONFIG.TOKEN_RATE * dt)

  // Move packets, handle arrivals.
  const live = []
  for (const p of sim.packets) {
    p.progress += p.speed * dt
    const a = BY_ID[p.from]
    const b = BY_ID[p.to]
    const k = Math.min(p.progress, 1)
    p.x = a.x + (b.x - a.x) * k
    p.y = a.y + (b.y - a.y) * k
    if (sim.t - p.lastTrail > 0.045) {
      p.trail.unshift({ x: p.x, y: p.y })
      if (p.trail.length > 7) p.trail.pop()
      p.lastTrail = sim.t
    }
    if (p.progress < 1) {
      live.push(p)
      continue
    }
    if (p.to === 'router') {
      let drop = false
      if (mode === 'red') {
        sim.avg = (1 - CONFIG.RED_W) * sim.avg + CONFIG.RED_W * sim.buffer
        const occ = sim.avg / CONFIG.MAX_BUFFER
        if (occ >= CONFIG.RED_MAX) drop = true
        else if (occ > CONFIG.RED_MIN) {
          const pd = ((occ - CONFIG.RED_MIN) / (CONFIG.RED_MAX - CONFIG.RED_MIN)) * CONFIG.RED_MAX_P
          drop = Math.random() < pd
        }
      }
      if (!drop && sim.buffer >= CONFIG.MAX_BUFFER) drop = true
      if (drop) {
        sim.dropped++
        burst(sim, p.x * w, p.y * h, 'drop', 12)
      } else {
        sim.buffer++
      }
    } else if (p.to === 'server') {
      sim.arrived++
      burst(sim, p.x * w, p.y * h, 'ok', 5)
    } else {
      sim.rates[p.to] = 0.2
      burst(sim, p.x * w, p.y * h, 'warn', 9)
    }
  }
  sim.packets = live

  // Buffer drain at the mode's output rate.
  const rate = mode === 'leaky' ? CONFIG.LEAK_RATE : CONFIG.LINK_CAPACITY
  sim.drainAcc = Math.min(sim.drainAcc + rate * dt, 3)
  while (sim.drainAcc >= 1 && sim.buffer > 0) {
    if (mode === 'token') {
      if (sim.tokens < 1) break
      sim.tokens -= 1
    }
    sim.drainAcc -= 1
    sim.buffer--
    sim.packets.push({ from: 'router', to: 'server', progress: 0, speed: 0.65, type: 'data', trail: [], lastTrail: 0 })
  }
  if (sim.buffer === 0) sim.drainAcc = Math.min(sim.drainAcc, 1)

  // Choke packet: router signals the source that is still sending the most.
  sim.chokeCd -= dt
  if (mode === 'choke' && sim.buffer > CONFIG.MAX_BUFFER * CONFIG.CHOKE_THRESHOLD && sim.chokeCd <= 0) {
    const target = SOURCES.reduce((best, n) => (sim.rates[n.id] > sim.rates[best.id] ? n : best), SOURCES[0])
    sim.packets.push({ from: 'router', to: target.id, progress: 0, speed: 1.4, type: 'choke', trail: [], lastTrail: 0 })
    sim.chokeCd = CONFIG.CHOKE_COOLDOWN
  }

  sim.particles = sim.particles.filter((q) => {
    q.x += q.vx * dt
    q.y += q.vy * dt
    q.life -= 1.6 * dt
    return q.life > 0
  })
}

function draw(ctx, sim, mode, view, th, tms) {
  const { w, h } = view
  const col = (k) => th[k]
  ctx.clearRect(0, 0, w, h)

  // Dot grid.
  ctx.fillStyle = col('line')
  for (let x = 12; x < w; x += 24) for (let y = 12; y < h; y += 24) ctx.fillRect(x, y, 1, 1)

  const boxW = Math.min(88, w * (w < 520 ? 0.19 : 0.15))
  const boxH = Math.min(34, h * 0.11)
  const router = BY_ID.router
  const rx = router.x * w
  const ry = router.y * h
  const server = BY_ID.server
  const small = w < 520
  const fs = small ? 9 : 11

  // Links.
  ctx.lineWidth = 1
  ctx.strokeStyle = col('line-strong')
  SOURCES.forEach((n) => {
    ctx.beginPath()
    ctx.moveTo(n.x * w + boxW / 2, n.y * h)
    ctx.lineTo(rx - 22, ry)
    ctx.stroke()
  })
  ctx.strokeStyle = col('warn')
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 5])
  ctx.lineDashOffset = -tms * 0.03
  ctx.beginPath()
  ctx.moveTo(rx + 22, ry)
  ctx.lineTo(server.x * w - boxW / 2, server.y * h)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.font = `${fs - 1}px ${th.mono}`
  ctx.textAlign = 'center'
  ctx.fillStyle = col('ink-dim')
  ctx.fillText(small ? '10 Mbps' : '10 Mbps bottleneck', (rx + 22 + server.x * w - boxW / 2) / 2, ry - 12)

  // Source / sink boxes.
  NODES.filter((n) => n.type !== 'router').forEach((n) => {
    const nx = n.x * w
    const ny = n.y * h
    const throttled = n.type === 'source' && sim.rates[n.id] < 0.8
    ctx.fillStyle = col('bg-2')
    ctx.strokeStyle = throttled ? col('warn') : n.type === 'sink' ? col('ok') : col('line-strong')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(nx - boxW / 2, ny - boxH / 2, boxW, boxH, 8)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = col('ink')
    ctx.font = `600 ${fs}px ${th.mono}`
    ctx.fillText(n.label, nx, ny + (throttled ? -1 : 4))
    if (throttled) {
      ctx.fillStyle = col('warn')
      ctx.font = `${fs - 3}px ${th.mono}`
      ctx.fillText('slowed down', nx, ny + 10)
    }
  })

  // Router, with a halo for the shaping modes.
  if (mode === 'leaky' || mode === 'token') {
    ctx.globalAlpha = 0.14
    ctx.fillStyle = mode === 'leaky' ? col('flow') : col('token')
    ctx.beginPath()
    ctx.arc(rx, ry, 38, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.fillStyle = col('bg-2')
  ctx.strokeStyle = col('warn')
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(rx, ry, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = col('ink')
  ctx.font = `600 ${fs + 1}px ${th.mono}`
  ctx.fillText(router.label, rx, ry + 4)

  // Buffer strip under the router.
  const fill = sim.buffer / CONFIG.MAX_BUFFER
  const bc = fill > 0.8 ? col('drop') : fill > 0.5 ? col('warn') : col('flow')
  const cw = Math.min(9, w * 0.016)
  const cg = 2
  const bw = CELLS * cw + (CELLS - 1) * cg
  const bx = rx - bw / 2
  const by = ry + 42
  const lit = Math.ceil(fill * CELLS)
  for (let i = 0; i < CELLS; i++) {
    ctx.globalAlpha = i < lit ? 1 : 0.18
    ctx.fillStyle = i < lit ? bc : col('line-strong')
    ctx.fillRect(bx + i * (cw + cg), by, cw, 9)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = bc
  ctx.font = `${fs - 1}px ${th.mono}`
  ctx.fillText(`buffer ${Math.round(fill * 100)}%`, rx, by + 24)
  if (mode === 'token') {
    ctx.fillStyle = col('token')
    ctx.fillText(`tokens ${Math.floor(sim.tokens)}/${CONFIG.TOKEN_MAX}`, rx, by + 38)
  }

  // Packets.
  const pc = { data: col('flow'), choke: col('warn') }
  sim.packets.forEach((p) => {
    const c = pc[p.type]
    p.trail.forEach((t, i) => {
      ctx.globalAlpha = (1 - i / p.trail.length) * 0.4
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(t.x * w, t.y * h, 2, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    ctx.fillStyle = c
    ctx.shadowColor = c
    ctx.shadowBlur = 8
    if (p.type === 'choke') {
      ctx.save()
      ctx.translate(p.x * w, p.y * h)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-4, -4, 8, 8)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
  })

  sim.particles.forEach((q) => {
    ctx.globalAlpha = Math.max(0, q.life)
    ctx.fillStyle = col(q.color)
    ctx.beginPath()
    ctx.arc(q.x, q.y, 2 * q.life + 0.4, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

export default function CongestionDemo() {
  const [mode, setMode] = useState('none')
  const [stats, setStats] = useState({ sent: 0, arrived: 0, dropped: 0 })
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const modeRef = useRef('none')
  const simRef = useRef(createSim())
  const redrawRef = useRef(() => {})
  const reduced = useRef(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Switching mechanism restarts the run so results are comparable.
  useEffect(() => {
    modeRef.current = mode
    simRef.current = createSim()
    setStats({ sent: 0, arrived: 0, dropped: 0 })
    if (reduced.current) redrawRef.current(true)
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined
    const ctx = canvas.getContext('2d')
    const view = { w: 0, h: 0 }
    let theme = readTheme()
    let raf = 0
    let last = 0
    let visible = true

    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      view.w = w
      view.h = h
    }
    resize()

    // Reduced motion: fast-forward once and show a still frame.
    redrawRef.current = (reset) => {
      if (!view.w) return
      if (reset) {
        const sim = simRef.current
        for (let i = 0; i < 600; i++) step(sim, modeRef.current, 1 / 30, view)
      }
      draw(ctx, simRef.current, modeRef.current, view, theme, 0)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduced.current) redrawRef.current(false)
    })
    ro.observe(wrap)
    const mo = new MutationObserver(() => {
      theme = readTheme()
      if (reduced.current) redrawRef.current(false)
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    if (reduced.current) {
      redrawRef.current(true)
      return () => {
        ro.disconnect()
        mo.disconnect()
      }
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(wrap)

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - (last || now)) / 1000, 0.05)
      last = now
      if (!visible || document.hidden || !view.w) return
      step(simRef.current, modeRef.current, dt, view)
      draw(ctx, simRef.current, modeRef.current, view, theme, now)
    }
    raf = requestAnimationFrame(frame)

    // React state snapshot at ~8 Hz, not every frame.
    const snap = window.setInterval(() => {
      if (!visible || document.hidden) return
      const s = simRef.current
      setStats((p) => (p.sent === s.sent && p.arrived === s.arrived && p.dropped === s.dropped ? p : { sent: s.sent, arrived: s.arrived, dropped: s.dropped }))
    }, 125)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(snap)
      ro.disconnect()
      mo.disconnect()
      io.disconnect()
    }
  }, [])

  const current = MODES.find((m) => m.id === mode)

  return (
    <div className="cdemo">
      <div className="cdemo-bar">
        <span className="cdemo-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono cdemo-title">r1-gateway — live</span>
      </div>
      <div className="cdemo-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Three campus LANs send packets to router R1, which forwards them over a 10 Mbps bottleneck link to the server. The buffer under R1 shows how full the queue is."
        />
        <dl className="cdemo-stats mono">
          <div>
            <dt>Sent</dt>
            <dd style={{ color: 'var(--flow)' }}>{stats.sent.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Delivered</dt>
            <dd style={{ color: 'var(--ok)' }}>{stats.arrived.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Dropped</dt>
            <dd style={{ color: 'var(--drop)' }}>{stats.dropped.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <div className="cdemo-foot">
        <div className="cdemo-modes" role="group" aria-label="Congestion control mechanism">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === mode ? 'cdemo-mode is-active' : 'cdemo-mode'}
              aria-pressed={m.id === mode}
              title={m.desc}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="cdemo-desc" aria-live="polite">
          {current.desc}
        </p>
      </div>
    </div>
  )
}
