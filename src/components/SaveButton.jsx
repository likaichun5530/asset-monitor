export default function SaveButton({ saving = false, saved = false, disabled = false, onClick, type = 'button', label = '保存', savingLabel = '保存中…', savedText = '已保存', className = '' }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className={`whitespace-nowrap text-xs font-medium text-green-600 transition-opacity dark:text-green-400 ${saved ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <span aria-hidden="true">✓ </span>{savedText}
      </span>
      <button type={type} onClick={onClick} disabled={disabled || saving} className={`rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-50 ${className}`}>
        {saving ? savingLabel : label}
      </button>
    </div>
  )
}
