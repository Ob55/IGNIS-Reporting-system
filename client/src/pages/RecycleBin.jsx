import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, authFetch } from '../context/AuthContext';

export default function RecycleBin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchBin() {
    setLoading(true);
    try {
      const res = await authFetch('/api/dashboard/recycle-bin');
      if (res.status === 401) { logout(); navigate('/login'); return; }
      if (res.status === 403) { navigate('/dashboard'); return; }
      const json = await res.json();
      setItems(json.items);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { fetchBin(); }, []);

  async function handleRestore(id) {
    try {
      const res = await authFetch(`/api/dashboard/recycle-bin/restore/${id}`, { method: 'POST' });
      if (res.ok) setItems(prev => prev.filter(i => i._id !== id));
    } catch { /* ignore */ }
  }

  async function handlePermanentDelete(id) {
    if (!confirm('Permanently delete this report? This cannot be undone.')) return;
    try {
      const res = await authFetch(`/api/dashboard/recycle-bin/${id}`, { method: 'DELETE' });
      if (res.ok) setItems(prev => prev.filter(i => i._id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-ignis-green text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/80 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-ignis-orange rounded-lg flex items-center justify-center text-white font-bold text-xl">I</div>
            <div>
              <h1 className="text-xl font-bold">Ignis Innovation</h1>
              <p className="text-green-200 text-sm">Recycle Bin</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{user?.fullName}</p>
            <p className="text-green-200 capitalize">{user?.role}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-ignis-orange mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-800">Reports in the recycle bin are automatically deleted after 10 days.</p>
            <p className="text-xs text-orange-600 mt-1">Restore reports before the countdown ends to keep them.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-gray-400 text-lg">Recycle bin is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item._id} className="bg-white rounded-xl shadow border-l-4 border-red-300 overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-4">
                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800">{item.firstName} {item.lastName}</p>
                      <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.weekIdentifier}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{item.email}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.workDone}</p>
                  </div>

                  {/* Days Remaining */}
                  <div className="text-center px-4">
                    <p className={`text-2xl font-bold ${item.daysLeft <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                      {item.daysLeft}
                    </p>
                    <p className="text-xs text-gray-400">days left</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(item._id)}
                      className="bg-ignis-green text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item._id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
