'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface VenueAdmin {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'superadmin';
  primary?: boolean;
}

export default function VenueAdmins({ locationId, admins }: { locationId: string; admins: VenueAdmin[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAdmin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/venues/${locationId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Could not add this administrator.');
        return;
      }
      setEmail('');
      setDisplayName('');
      setPassword('');
      router.refresh();
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-gray-900">Venue administrators</h2>
          <p className="text-xs text-secondary mt-1">These email accounts can administer this venue’s games.</p>
        </div>
        <span className="text-xs text-muted">{admins.length} access{admins.length === 1 ? '' : 'es'}</span>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border mb-4">
        {admins.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted">No venue administrators yet.</p>
        ) : admins.map(admin => (
          <div key={admin.uid} className="px-3 py-2.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{admin.displayName || admin.email}</p>
              <p className="text-xs text-secondary">{admin.email}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-secondary border-border whitespace-nowrap">
              {admin.primary ? 'Primary · global access' : 'Venue admin'}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={addAdmin} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Venue manager"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@venue.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Initial password</label>
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary text-sm px-3 py-2 disabled:opacity-50 whitespace-nowrap">
          {busy ? 'Adding…' : 'Add admin'}
        </button>
      </form>
      <p className="text-xs text-muted mt-2">An email already used by an admin is not moved from its current venue.</p>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
    </section>
  );
}
