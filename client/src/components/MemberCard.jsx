export default function MemberCard({ member, onClick }) {
  const submitted = member.submitted;
  const sub = member.submission;
  const initials = member.fullName
    ? member.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const attachCount = sub?.attachments?.length || 0;

  return (
    <div
      className={`rounded-xl shadow overflow-hidden border-2 cursor-pointer hover:shadow-lg transition ${submitted ? 'border-ignis-green/30' : 'border-red-300'}`}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className={`px-4 py-3 flex items-center gap-3 ${submitted ? 'bg-ignis-light' : 'bg-red-50'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${submitted ? 'bg-ignis-green' : 'bg-red-400'}`}>
          {submitted ? initials : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{member.fullName}</p>
          <p className="text-xs text-gray-500 truncate">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {attachCount > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {attachCount}
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${submitted ? 'bg-ignis-green text-white' : 'bg-red-500 text-white'}`}>
            {submitted ? 'Submitted' : 'Missing'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-4 bg-white">
        {submitted ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-ignis-green mb-1">Work Done</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{sub.workDone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ignis-orange mb-1">Upcoming Work</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{sub.upcomingWork}</p>
            </div>
            <p className="text-xs text-gray-400">
              Submitted: {new Date(sub.submissionTimestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-400 font-mono text-lg tracking-wider">???????????????????</p>
            <p className="text-sm text-gray-400 mt-2">No report submitted</p>
          </div>
        )}
      </div>
    </div>
  );
}
