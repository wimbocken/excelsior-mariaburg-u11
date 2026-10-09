import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { FEATURES } from './features';
import { Home } from './pages/Home';
import { Lineup } from './pages/Lineup';
import { Login } from './pages/Login';
import { MatchLive } from './pages/MatchLive';
import { Matches } from './pages/Matches';
import { Players } from './pages/Players';
import { Spectator } from './pages/Spectator';
import { Stats } from './pages/Stats';
import { useAppStore } from './useAppStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/volgen/:id" element={<Spectator />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/wedstrijden" element={<Matches />} />
        <Route path="/spelers" element={<Players />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/live/:id" element={<MatchLive />} />
        {FEATURES.lineup ? <Route path="/opstelling/:id" element={<Lineup />} /> : null}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
