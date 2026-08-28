export default function RobotIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 7V4.5" />
      <circle cx="16" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M6 15H4.5a2 2 0 0 0 0 4H6M26 15h1.5a2 2 0 0 1 0 4H26" />
      <rect x="6" y="7" width="20" height="19" rx="7" fill="currentColor" fillOpacity=".16" />
      <rect x="6" y="7" width="20" height="19" rx="7" />
      <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="15" r="2" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="19" r="1.2" fill="currentColor" fillOpacity=".35" stroke="none" />
      <circle cx="22.5" cy="19" r="1.2" fill="currentColor" fillOpacity=".35" stroke="none" />
      <path d="M12 20.5c1 1 2.35 1.5 4 1.5s3-.5 4-1.5" />
      <path d="m26.5 6 .55 1.45L28.5 8l-1.45.55L26.5 10l-.55-1.45L24.5 8l1.45-.55L26.5 6Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
