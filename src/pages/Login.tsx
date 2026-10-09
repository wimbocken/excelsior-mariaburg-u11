import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../store';
import type { Admin } from '../types';

const PINS: Record<Admin, string> = {
  Rian: '1234',
  Wim: '5678',
};

export function Login() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Admin | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (!selected) return;
    if (pin === PINS[selected]) {
      login(selected);
      navigate('/', { replace: true });
      return;
    }
    setError(true);
    setPin('');
  };

  const pick = (user: Admin) => {
    setSelected(user);
    setPin('');
    setError(false);
  };

  return (
    <div className="login">
      <div className="login-brand">
        <img
          className="login-logo"
          src="/logo-excelsior-mariaburg.png"
          alt="Excelsior Mariaburg"
          width={168}
          height={168}
        />
        <div className="club">Excelsior Mariaburg</div>
        <div className="team">U11 · Matchday</div>
        <p>Kies je account en vul je pincode in.</p>
      </div>

      {!selected ? (
        <div className="login-actions">
          <button type="button" className="login-btn" onClick={() => pick('Rian')}>
            Rian
            <span>Admin</span>
          </button>
          <button type="button" className="login-btn" onClick={() => pick('Wim')}>
            Wim
            <span>Admin</span>
          </button>
        </div>
      ) : (
        <div className="login-actions">
          <div className="login-pin-card">
            <div className="login-pin-user">{selected}</div>
            <label className="login-pin-label" htmlFor="pin">
              Pincode
            </label>
            <input
              id="pin"
              className="login-pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={8}
              value={pin}
              autoFocus
              placeholder="····"
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
            {error && <div className="login-pin-error">Verkeerde pincode</div>}
            <button type="button" className="btn btn-primary btn-block" onClick={submit}>
              Inloggen
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              style={{ color: 'rgba(255,255,255,0.75)' }}
              onClick={() => setSelected(null)}
            >
              Andere gebruiker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
