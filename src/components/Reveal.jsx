import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

const hidden = { opacity: 0, y: 18, filter: 'blur(6px)' }
const shown = {
  opacity: 1,
  y: 0,
  filter: 'blur(0px)',
  transitionEnd: { filter: 'none' },
}

/* Fade, rise and un-blur when scrolled into view. */
export default function Reveal({ children, delay = 0, className, as = 'div', amount = 0.15 }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  if (reduce) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }
  return (
    <Tag
      className={className}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: true, amount, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  )
}

const container = (stagger, delay) => ({
  hidden: {},
  shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

const item = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  shown: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
    transitionEnd: { filter: 'none' },
  },
}

/* Parent that staggers its StaggerItem children as it enters the viewport. */
export function Stagger({ children, className, as = 'div', stagger = 0.06, delay = 0, amount = 0.1 }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  if (reduce) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }
  return (
    <Tag
      className={className}
      variants={container(stagger, delay)}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount, margin: '0px 0px -30px 0px' }}
    >
      {children}
    </Tag>
  )
}

export function StaggerItem({ children, className, as = 'div' }) {
  const reduce = useReducedMotion()
  const Tag = motion[as] || motion.div
  if (reduce) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }
  return (
    <Tag className={className} variants={item}>
      {children}
    </Tag>
  )
}
