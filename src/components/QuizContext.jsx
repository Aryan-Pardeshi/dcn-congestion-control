import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const QuizContext = createContext(null)

export function QuizProvider({ children }) {
  const [open, setOpen] = useState(false)
  const openQuiz = useCallback(() => setOpen(true), [])
  const closeQuiz = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ open, openQuiz, closeQuiz }), [open, openQuiz, closeQuiz])
  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  const ctx = useContext(QuizContext)
  if (!ctx) throw new Error('useQuiz must be used inside QuizProvider')
  return ctx
}
