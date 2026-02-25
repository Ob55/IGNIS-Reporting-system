import { useState } from 'react';
import { authFetch } from '../context/AuthContext';

export default function AddMemberModal({ onClose, onAdded }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLink, setSetupLink] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/members', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add member');
        return;
      }
      setSetupLink(data.setupLink);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(setupLink);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-ignis-orange text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <h3 className="font-bold text-lg">Add Dashboard Viewer</h3>
          <button onClick={setupLink ? onAdded : onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {!setupLink ? (
            <>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ignis-orange focus:border-transparent outline-none"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ignis-orange focus:border-transparent outline-none"
                    placeholder="jane@ignis-innovation.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ignis-orange outline-none"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 bg-ignis-orange text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50">
                    {loading ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div>
              <p className="text-green-600 font-semibold mb-3">Member added successfully!</p>
              <p className="text-sm text-gray-600 mb-2">A setup email has been sent. You can also share this link directly:</p>
              <div className="bg-gray-50 border rounded-lg p-3 flex items-center gap-2">
                <input type="text" readOnly value={setupLink} className="flex-1 bg-transparent text-sm text-gray-600 outline-none" />
                <button onClick={copyLink} className="text-ignis-green hover:underline text-sm font-medium whitespace-nowrap">Copy</button>
              </div>
              <button onClick={onAdded} className="w-full mt-4 bg-ignis-green text-white py-2 rounded-lg font-semibold hover:bg-green-800 transition">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
