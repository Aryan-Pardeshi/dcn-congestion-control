import { createPortal } from 'react-dom'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import LoadingOverlay from '@/components/ui/loading-overlay'
import Navbar from './components/Navbar'
import QuizModal from './components/QuizModal'
import SmoothScroll, { useSmoothScroll } from './components/SmoothScroll'
import { QuizProvider, useQuiz } from './components/QuizContext'
import useSpotlight from './components/anim/useSpotlight'
import Landing from './pages/Landing'
import Simulator from './pages/Simulator'

const pageVariants = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
  exit: { opacity: 0, y: -6, filter: 'blur(4px)' },
}

function Shell() {
  const location = useLocation()
  const { open } = useQuiz()
  const { resetScroll } = useSmoothScroll()
  useSpotlight()

  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait" onExitComplete={resetScroll}>
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/simulator" element={<Simulator />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {createPortal(<AnimatePresence>{open && <QuizModal key="quiz" />}</AnimatePresence>, document.body)}
    </>
  )
}

export default function App() {
  // Show the preloader on every full page load / reload; stays mounted so route changes don't retrigger it
  // and so completing it never remounts Shell (LoadingOverlay keeps one stable wrapper element).

  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>
        <QuizProvider>
          <LoadingOverlay>
            <Shell />
          </LoadingOverlay>
        </QuizProvider>
      </SmoothScroll>
    </MotionConfig>
  )
}
