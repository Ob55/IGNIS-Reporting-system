import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, authFetch } from '../context/AuthContext';
import MemberCard from '../components/MemberCard';
import AddMemberModal from '../components/AddMemberModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async (week) => {
    setLoading(true);
    try {
      const url = week ? `/api/dashboard?week=${week}` : '/api/dashboard';
      const res = await authFetch(url);
      if (res.status === 401) { logout(); navigate('/login'); return; }
      const json = await res.json();
      setData(json);
      if (!selectedWeek) setSelectedWeek(json.weekId);
    } catch { /* ignore */ }
    setLoading(false);
  }, [logout, navigate, selectedWeek]);

  const fetchWeeks = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/weeks');
      if (res.ok) {
        const json = await res.json();
        setWeeks(json.weeks);
        setCurrentWeek(json.currentWeek);
        if (!selectedWeek) setSelectedWeek(json.currentWeek);
      }
    } catch { /* ignore */ }
  }, [selectedWeek]);

  useEffect(() => { fetchWeeks(); }, [fetchWeeks]);
  useEffect(() => { if (selectedWeek) fetchDashboard(selectedWeek); }, [selectedWeek, fetchDashboard]);

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  const members = data?.members || [];

  // Apply filter then search
  const afterFilter = filter === 'all' ? members :
    filter === 'submitted' ? members.filter(m => m.submitted) :
    members.filter(m => !m.submitted);

  const filtered = search.trim()
    ? afterFilter.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      )
    : afterFilter;

  const stats = data?.stats || { total: 0, submitted: 0, missing: 0 };

  function formatWeekLabel(weekId) {
    if (!weekId) return '';
    const [w, y] = weekId.replace('W', '').split('-');
    return `Week ${w} \u2014 ${y}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-ignis-green text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ignis-orange rounded-lg flex items-center justify-center text-white font-bold text-xl">I</div>
            <div>
              <h1 className="text-xl font-bold">Ignis Innovation</h1>
              <p className="text-green-200 text-sm">Weekly Report Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <>
                <button onClick={() => navigate('/recycle-bin')} className="border border-white/30 text-white px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Recycle Bin
                </button>
                <button onClick={() => setShowAddModal(true)} className="bg-ignis-orange text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition text-sm">
                  + Add Viewer
                </button>
              </>
            )}
            <div className="text-right text-sm">
              <p className="font-semibold">{user?.fullName}</p>
              <p className="text-green-200 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleSignOut} className="border border-white/30 text-white px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Week Selector */}
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-gray-800">{formatWeekLabel(selectedWeek)}</h2>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ignis-green outline-none"
          >
            {weeks.map(w => (
              <option key={w} value={w}>{formatWeekLabel(w)}</option>
            ))}
          </select>
          <button onClick={() => fetchDashboard(selectedWeek)} className="text-ignis-green hover:underline text-sm font-medium">
            Refresh
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div
            className="bg-white rounded-xl shadow p-4 text-center cursor-pointer hover:shadow-md transition"
            onClick={() => setFilter('all')}
          >
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Members</p>
          </div>
          <div
            className="bg-ignis-light rounded-xl shadow p-4 text-center cursor-pointer hover:shadow-md transition border-2 border-ignis-green/20"
            onClick={() => setFilter('submitted')}
          >
            <p className="text-3xl font-bold text-ignis-green">{stats.submitted}</p>
            <p className="text-sm text-ignis-green">Submitted</p>
          </div>
          <div
            className="bg-red-50 rounded-xl shadow p-4 text-center cursor-pointer hover:shadow-md transition border-2 border-red-200"
            onClick={() => setFilter('missing')}
          >
            <p className="text-3xl font-bold text-red-600">{stats.missing}</p>
            <p className="text-sm text-red-600">Missing</p>
          </div>
        </div>

        {/* Total Members Table */}
        <div className="bg-white rounded-xl shadow mb-6 overflow-hidden">
          <div className="px-5 py-3 bg-ignis-green/5 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Team Members ({stats.total})</h3>
            <span className="text-xs text-gray-400">Source: Agent roster</span>
          </div>
          {members.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-2">#</th>
                    <th className="px-5 py-2">Name</th>
                    <th className="px-5 py-2">Email</th>
                    <th className="px-5 py-2">Status</th>
                    <th className="px-5 py-2">Attachments</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr
                      key={m._id}
                      className="border-t hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/history?email=${encodeURIComponent(m.email)}`)}
                    >
                      <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{m.fullName}</td>
                      <td className="px-5 py-3 text-gray-500">{m.email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${m.submitted ? 'bg-ignis-green text-white' : 'bg-red-500 text-white'}`}>
                          {m.submitted ? 'Submitted' : 'Missing'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {m.submission?.attachments?.length || 0} file{(m.submission?.attachments?.length || 0) !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Search + Filter Row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-ignis-green focus:border-transparent outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                &times;
              </button>
            )}
          </div>
          {['all', 'submitted', 'missing'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === f
                  ? 'bg-ignis-green text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'submitted' ? 'Submitted' : 'Missing'}
            </button>
          ))}
        </div>

        {/* Member Cards Grid */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            {search ? `No members matching "${search}"` : 'No members to show.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => (
              <MemberCard key={m._id} member={m} onClick={() => navigate(`/history?email=${encodeURIComponent(m.email)}`)} />
            ))}
          </div>
        )}
      </main>

      {/* Add Viewer Modal */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchDashboard(selectedWeek);
            fetchWeeks();
          }}
        />
      )}
    </div>
  );
}
