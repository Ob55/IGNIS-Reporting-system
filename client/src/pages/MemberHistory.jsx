import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, authFetch } from '../context/AuthContext';

const PER_PAGE = 15;

export default function MemberHistory() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      if (!email) {
        setError('No email provided.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await authFetch(`/api/dashboard/history?email=${encodeURIComponent(email)}`);
        if (cancelled) return;
        if (res.status === 401) { logout(); navigate('/login'); return; }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || `Server error (${res.status})`);
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError('Failed to load member history. Check that the server is running.');
      }
      if (!cancelled) setLoading(false);
    }

    fetchHistory();

    return () => { cancelled = true; };
  }, [email, logout, navigate]);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Move this report to the recycle bin?')) return;
    try {
      const res = await authFetch(`/api/dashboard/submissions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setData(prev => ({
          ...prev,
          submissions: prev.submissions.filter(s => s._id !== id),
        }));
        if (expanded === id) setExpanded(null);
      }
    } catch { /* ignore */ }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const initials = data?.fullName
    ? data.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const submissions = data?.submissions || [];
  const totalPages = Math.ceil(submissions.length / PER_PAGE);
  const paginated = submissions.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-ignis-green text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/80 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-ignis-orange rounded-lg flex items-center justify-center text-white font-bold text-xl">I</div>
            <div>
              <h1 className="text-xl font-bold">Ignis Innovation</h1>
              <p className="text-green-200 text-sm">Member Report History</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading...</p>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-ignis-green hover:underline font-medium">
              Back to Dashboard
            </button>
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Member not found.</p>
            <button onClick={() => navigate('/dashboard')} className="text-ignis-green hover:underline font-medium">
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Member Info */}
            <div className="bg-white rounded-xl shadow p-6 mb-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-ignis-green rounded-full flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">{data.fullName || 'Unknown'}</h2>
                <p className="text-gray-500 text-sm">{data.email}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-ignis-green">{submissions.length}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </div>
            </div>

            {/* Reports Grid */}
            {submissions.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No reports found for this member.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {paginated.map((sub, i) => {
                    const globalIndex = (page - 1) * PER_PAGE + i;
                    const isLatest = globalIndex === 0;
                    const date = new Date(sub.submissionTimestamp);
                    const hasAttachments = sub.attachments && sub.attachments.length > 0;

                    return (
                      <div
                        key={sub._id}
                        onClick={() => setExpanded(expanded === sub._id ? null : sub._id)}
                        className={`bg-white rounded-xl shadow hover:shadow-md transition cursor-pointer flex flex-col overflow-hidden border-t-4 ${isLatest ? 'border-ignis-orange' : 'border-ignis-green'}`}
                      >
                        {/* Card Top */}
                        <div className="p-3 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <span className="bg-ignis-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {sub.weekIdentifier}
                            </span>
                            {isLatest && (
                              <span className="bg-ignis-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Latest
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-400 mb-2">
                            {date.toLocaleDateString()}
                          </p>

                          <div className="flex-1">
                            <p className="text-xs font-semibold text-ignis-green mb-0.5">Work Done</p>
                            <p className="text-xs text-gray-600 line-clamp-3 mb-2">{sub.workDone}</p>
                            <p className="text-xs font-semibold text-ignis-orange mb-0.5">Upcoming</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{sub.upcomingWork}</p>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-3 py-2 bg-gray-50 border-t flex items-center justify-between">
                          <div className="flex items-center gap-1 text-gray-400">
                            {hasAttachments && (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span className="text-[10px]">{sub.attachments.length}</span>
                              </>
                            )}
                          </div>
                          {user?.role === 'admin' && (
                            <button
                              onClick={(e) => handleDelete(e, sub._id)}
                              className="text-red-300 hover:text-red-500 transition"
                              title="Move to recycle bin"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                          page === p
                            ? 'bg-ignis-green text-white'
                            : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                )}

                {/* Expanded Report Detail */}
                {expanded && (() => {
                  const sub = submissions.find(s => s._id === expanded);
                  if (!sub) return null;
                  return (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setExpanded(null)}>
                      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-ignis-light border-b flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="bg-ignis-green text-white text-xs font-bold px-3 py-1 rounded-full">
                              {sub.weekIdentifier}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(sub.submissionTimestamp).toLocaleString()}
                            </span>
                          </div>
                          <button onClick={() => setExpanded(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-ignis-green mb-1 uppercase tracking-wide">Work Done</h4>
                            <p className="text-gray-700 whitespace-pre-wrap">{sub.workDone}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-ignis-orange mb-1 uppercase tracking-wide">Upcoming Work</h4>
                            <p className="text-gray-700 whitespace-pre-wrap">{sub.upcomingWork}</p>
                          </div>
                          {sub.attachments && sub.attachments.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">
                                Attachments ({sub.attachments.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {sub.attachments.map((att, j) => (
                                  <a
                                    key={j}
                                    href={`/api/uploads/${att.fileName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 hover:bg-ignis-light transition text-sm"
                                  >
                                    <svg className="w-4 h-4 text-ignis-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">{att.originalName}</span>
                                    <span className="text-gray-400 text-xs">{formatSize(att.size)}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
