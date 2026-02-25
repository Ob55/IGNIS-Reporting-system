export default function MemberDetailModal({ member, onClose }) {
  const submitted = member.submitted;
  const sub = member.submission;
  const initials = member.fullName
    ? member.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-xl flex items-center gap-4 ${submitted ? 'bg-ignis-green' : 'bg-red-500'} text-white`}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
            {submitted ? initials : '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{member.fullName}</h2>
            <p className="text-sm opacity-80">{member.email}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${submitted ? 'bg-white/20' : 'bg-white/20'}`}>
            {submitted ? 'Submitted' : 'Missing'}
          </span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl ml-2">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <div className="space-y-6">
              {/* Work Done */}
              <div>
                <h3 className="text-sm font-bold text-ignis-green mb-2 uppercase tracking-wide">Work Done This Week</h3>
                <div className="bg-ignis-light rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{sub.workDone}</p>
                </div>
              </div>

              {/* Upcoming Work */}
              <div>
                <h3 className="text-sm font-bold text-ignis-orange mb-2 uppercase tracking-wide">Upcoming Week's Plan</h3>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{sub.upcomingWork}</p>
                </div>
              </div>

              {/* Attachments */}
              {sub.attachments && sub.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Attachments ({sub.attachments.length})</h3>
                  <div className="space-y-2">
                    {sub.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={`/api/uploads/${att.fileName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition"
                      >
                        <div className="w-10 h-10 bg-ignis-green/10 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-ignis-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{att.originalName}</p>
                          <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-400 text-right">
                Submitted: {new Date(sub.submissionTimestamp).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-red-400 font-mono text-2xl tracking-wider mb-3">???????????????????</p>
              <p className="text-gray-400">No report submitted for this week</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
