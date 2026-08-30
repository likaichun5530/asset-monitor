const FEATURES = [
  {
    title: '资产总览',
    description: '集中查看总资产、涨跌指标、资产趋势、配置比例、账户分布和每日收益。',
    tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    icon: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19V3" /></>,
  },
  {
    title: '持仓管理',
    description: '统一管理股票、债基、黄金、数字货币、现金和期货等多类资产。',
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 10h18" /><path d="M8 15h4" /></>,
  },
  {
    title: '配置目标',
    description: '对比实际与目标比例，识别超配和低配，并给出建议调整金额。',
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3" /></>,
  },
  {
    title: '行情与期货',
    description: '查看各市场行情、汇率和期货数据，辅助理解持仓的价格变化。',
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    icon: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
  },
  {
    title: 'AI 资产助手',
    description: '结合持仓、历史与目标配置进行分析，支持模型管理、回答规则和联网搜索。',
    tone: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300',
    icon: <><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M9 12h.01M15 12h.01M9 16h6M12 3v4" /></>,
  },
  {
    title: '快照与收益',
    description: '保存每日资产快照，通过收益日历回看各类资产变化并添加备注。',
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
  },
]

export default function AboutApp({ version }) {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 px-6 py-8 text-center text-gray-900 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 dark:text-gray-100 sm:px-10 sm:py-10">
        <div aria-hidden="true" className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-300/5" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-300/5" />
        <div className="relative mx-auto flex max-w-md flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] bg-white ring-1 ring-gray-200 dark:ring-gray-600 sm:h-[88px] sm:w-[88px]">
            <img src="/icon.png" alt="有数 App Logo" className="h-full w-full scale-[1.22] object-cover" />
          </div>
          <h3 className="mt-4 text-2xl font-bold tracking-[0.18em]">有数</h3>
          <p className="mt-1.5 text-[15px] font-medium tracking-[0.12em] text-gray-500 dark:text-gray-300">资产配置，心中有数</p>
          <span className="mt-4 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-[13px] font-medium text-gray-500 shadow-sm backdrop-blur dark:border-gray-600 dark:bg-gray-700/80 dark:text-gray-300">Version {version}</span>
        </div>
      </section>

      <section className="p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">功能介绍</h3>
          <p className="mt-1 text-[13px] leading-5 text-gray-400">为个人资产管理打造的一站式数据看板</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-700 dark:bg-gray-800/50">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${feature.tone}`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{feature.icon}</svg>
              </div>
              <h4 className="mt-3 text-[15px] font-semibold text-gray-800 dark:text-gray-200">{feature.title}</h4>
              <p className="mt-1 text-[13px] leading-5 text-gray-500 dark:text-gray-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-100 px-4 py-4 dark:border-gray-700 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-gray-400">
          <span>Google Sheets</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>Web · PWA</span>
        </div>
      </section>
    </div>
  )
}
