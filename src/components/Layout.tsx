import { Outlet } from 'react-router-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../store';
import { useAppStore } from '../useAppStore';

export function Layout() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Outlet />
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="icon">⌂</span>
          Home
        </NavLink>
        <NavLink
          to="/wedstrijden"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span className="icon">◷</span>
          Wedstrijden
        </NavLink>
        <NavLink to="/spelers" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="icon">◎</span>
          Spelers
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="icon">★</span>
          Stats
        </NavLink>
      </nav>
      <button
        type="button"
        className="btn btn-ghost"
        style={{
          position: 'fixed',
          top: 'calc(0.35rem + var(--safe-top))',
          right: 'max(0.5rem, calc(50% - 230px))',
          zIndex: 30,
          fontSize: '0.75rem',
        }}
        onClick={() => {
          logout();
          navigate('/login');
        }}
        aria-label="Uitloggen"
      >
        {currentUser} · uit
      </button>
    </div>
  );
}
