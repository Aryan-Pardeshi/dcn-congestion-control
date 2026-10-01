import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import { QuizProvider, useQuiz } from './components/QuizContext'
import Landing from './pages/Landing'
import Simulator from './pages/Simulator'

function Shell() {
  const location = useLocation()
  const { open } = useQuiz()

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/simulator" element={<Simulator />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {/* TODO(T6): render <QuizModal/> */}
      {open && <div data-quiz-placeholder />}
    </>
  )
}

export default function App() {
  return (
    <QuizProvider>
      <Shell />
    </QuizProvider>
  )
}
