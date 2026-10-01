import './AnimFrame.css'

/* Window-style frame around a mechanism animation, with real-text legend and caption. */
export default function AnimFrame({ title, legend = [], caption, children }) {
  return (
    <figure className="anim-frame">
      <div className="anim-bar">
        <span className="anim-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono anim-title">{title}</span>
      </div>
      <div className="anim-stage">{children}</div>
      <figcaption className="anim-foot">
        {legend.length > 0 && (
          <ul className="anim-legend">
            {legend.map((l) => (
              <li key={l.label}>
                <i style={{ background: l.color }} aria-hidden="true" />
                {l.label}
              </li>
            ))}
          </ul>
        )}
        {caption && <p>{caption}</p>}
      </figcaption>
    </figure>
  )
}
