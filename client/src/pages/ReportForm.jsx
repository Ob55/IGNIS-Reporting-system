import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ReportForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState(null);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [step, setStep] = useState(1);
  const [workDone, setWorkDone] = useState('');
  const [upcomingWork, setUpcomingWork] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageError('No form token provided.');
      setLoading(false);
      return;
    }
    fetch(`/api/form/info?token=${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) setPageError(data.error || 'Invalid form link');
        else setInfo(data);
      })
      .catch(() => setPageError('Network error'))
      .finally(() => setLoading(false));
  }, [token]);

  function handleFileChange(e) {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('workDone', workDone);
      formData.append('upcomingWork', upcomingWork);
      for (const file of files) {
        formData.append('attachments', file);
      }

      const res = await fetch('/api/form/submit', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Submission failed');
      setSuccess(true);
      setStep(3);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-ignis-green text-white py-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-ignis-orange rounded-lg flex items-center justify-center text-white font-bold text-xl">I</div>
          <h1 className="text-2xl font-bold">Ignis Innovation</h1>
        </div>
        <p className="text-green-200 mt-1">Weekly Report Form</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg">
          {loading && <p className="text-center text-gray-500">Loading form...</p>}

          {pageError && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">{pageError}</div>}

          {info && !success && (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2].map(s => (
                  <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-ignis-green text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {s}
                  </div>
                ))}
              </div>

              {/* Pre-filled info */}
              <div className="bg-ignis-light rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> <strong>{info.firstName} {info.lastName}</strong></div>
                  <div><span className="text-gray-500">Email:</span> <strong>{info.email}</strong></div>
                  <div className="col-span-2"><span className="text-gray-500">Week:</span> <strong>{info.weekId}</strong></div>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

              {/* Step 1: Work Done */}
              {step === 1 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Work Done This Week</h3>
                  <textarea
                    value={workDone}
                    onChange={e => setWorkDone(e.target.value)}
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-ignis-green focus:border-transparent outline-none resize-none"
                    placeholder="Describe what you accomplished this week..."
                  />
                  <button
                    onClick={() => { if (workDone.trim()) setStep(2); }}
                    disabled={!workDone.trim()}
                    className="w-full mt-4 bg-ignis-green text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}

              {/* Step 2: Upcoming Work + Attachments */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Upcoming Week's Plan</h3>

                  {/* Summary of step 1 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">Work Done (Summary)</p>
                    <p className="text-sm text-gray-700">{workDone}</p>
                  </div>

                  <textarea
                    value={upcomingWork}
                    onChange={e => setUpcomingWork(e.target.value)}
                    required
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-ignis-green focus:border-transparent outline-none resize-none"
                    placeholder="Describe your plans for next week..."
                  />

                  {/* File Attachments (Optional) */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 px-4 cursor-pointer hover:border-ignis-green hover:bg-ignis-light/50 transition">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm text-gray-500">Click to attach files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {/* File list */}
                    {files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-ignis-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                            <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
                      &larr; Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!upcomingWork.trim() || submitting}
                      className="flex-1 bg-ignis-green text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Success */}
          {success && info && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-ignis-green rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Report Submitted!</h3>
              <p className="text-gray-500">Thank you, {info.firstName}.</p>
              <p className="text-sm text-gray-400 mt-2">Week: {info.weekId}</p>
              {files.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">{files.length} file{files.length !== 1 ? 's' : ''} attached</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
