import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SetupPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [info, setInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageError('No setup token provided.');
      setLoading(false);
      return;
    }
    fetch(`/api/auth/verify-setup?token=${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) setPageError(data.error || 'Invalid setup link');
        else setInfo(data);
      })
      .catch(() => setPageError('Network error'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Setup failed');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-ignis-green text-white py-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-ignis-orange rounded-lg flex items-center justify-center text-white font-bold text-xl">I</div>
          <h1 className="text-2xl font-bold">Ignis Innovation</h1>
        </div>
        <p className="text-green-200 mt-1">Account Setup</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          {loading && <p className="text-center text-gray-500">Validating setup link...</p>}

          {pageError && (
            <div className="text-center">
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">{pageError}</div>
            </div>
          )}

          {info && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">Set Your Password</h2>
              <p className="text-gray-500 text-center mb-6">Welcome, {info.fullName}!</p>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={info.email} readOnly className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ignis-green focus:border-transparent outline-none" placeholder="At least 6 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-ignis-green focus:border-transparent outline-none" placeholder="Re-enter your password" />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-ignis-green text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50">
                  {submitting ? 'Activating...' : 'Activate Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
