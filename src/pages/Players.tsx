import { useState, type FormEvent } from 'react';
import { addPlayer, deletePlayer, updatePlayer } from '../store';
import type { Player } from '../types';
import { useAppStore } from '../useAppStore';

export function Players() {
  const { players } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const resetForm = () => {
    setName('');
    setNumber('');
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setName('');
    setNumber('');
    setShowForm(true);
  };

  const startEdit = (p: Player) => {
    setEditingId(p.id);
    setName(p.name);
    setNumber(p.number != null ? String(p.number) : '');
    setShowForm(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const num = number ? Number(number) : undefined;
    if (editingId) {
      updatePlayer(editingId, {
        name: name.trim(),
        number: num,
      });
    } else {
      addPlayer(name, num);
    }
    resetForm();
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Spelers</h1>
          <div className="sub">Selectie beheren</div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (showForm ? resetForm() : startCreate())}
        >
          {showForm ? 'Sluit' : '+ Nieuw'}
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={onSubmit} style={{ marginBottom: '0.85rem' }}>
          <label>
            Naam
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voornaam"
              autoFocus
              required
            />
          </label>
          <label>
            Rugnummer (optioneel)
            <input
              type="number"
              min={1}
              max={99}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="bv. 7"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block">
            {editingId ? 'Wijzigingen opslaan' : 'Speler toevoegen'}
          </button>
        </form>
      )}

      <div className="stack">
        {players.length === 0 && <div className="empty">Nog geen spelers. Voeg je selectie toe.</div>}
        {players.map((p) => (
          <div key={p.id} className="list-item">
            <div>
              <strong>
                {p.number != null ? `#${p.number} ` : ''}
                {p.name}
              </strong>
              <div className="meta">{p.active ? 'Actief' : 'Inactief'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                onClick={() => startEdit(p)}
              >
                Wijzig
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                onClick={() => updatePlayer(p.id, { active: !p.active })}
              >
                {p.active ? 'Pauze' : 'Actief'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: 'var(--danger)' }}
                onClick={() => {
                  if (confirm(`${p.name} verwijderen?`)) deletePlayer(p.id);
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
