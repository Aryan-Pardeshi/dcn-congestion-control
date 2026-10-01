import { motion, useReducedMotion } from 'framer-motion'

export default function Reveal({ children }) {
  const reduce = useReducedMotion()
  if (reduce) return <div>{children}</div>

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}
