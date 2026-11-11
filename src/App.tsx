import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from './store/useGame';
import { useDailyReset } from './hooks';
import { BottomNav, Hud, SideRail } from './components/Chrome';
import EventLayer from './components/EventLayer';
import ReviewModal from './components/ReviewModal';
import Onboarding from './pages/Onboarding';
import Camp from './pages/Camp';
import Quests from './pages/Quests';
import Hero from './pages/Hero';
import Market from './pages/Market';
import Chronicle from './pages/Chronicle';
import Settings from './pages/Settings';

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.8 }} className="h-display text-2xl text-ember-light">
        Ashen Oath
      </motion.p>
    </div>
  );
}

export default function App() {
  const hydrated = useGame((s) => s.hydrated);
  const hasHero = useGame((s) => !!s.hero);
  const location = useLocation();
  useDailyReset();

  if (!hydrated) return <Splash />;
  if (!hasHero) return <Onboarding />;

  return (
    <div className="flex min-h-screen">
      <SideRail />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(6rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] md:pb-10 md:pt-6">
          {location.pathname !== '/' && (
            <div className="sticky top-[calc(.5rem+var(--safe-top))] z-30 mb-5">
              <Hud />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Camp />} />
                <Route path="/quests" element={<Quests />} />
                <Route path="/hero" element={<Hero />} />
                <Route path="/market" element={<Market />} />
                <Route path="/chronicle" element={<Chronicle />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <BottomNav />
      <ReviewModal />
      <EventLayer />
    </div>
  );
}
