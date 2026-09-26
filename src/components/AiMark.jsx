export default function AiMark({ className = 'h-9 w-9' }) {
  return (
    <span className={`${className} relative inline-flex shrink-0 items-center justify-center text-slate-950 dark:text-white`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="15.25" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="42 6" transform="rotate(-33 18 18)" />
      </svg>
      <span className="relative text-[11px] font-bold leading-none tracking-[-0.085em]">AI</span>
    </span>
  )
}
