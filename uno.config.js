import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  shortcuts: {
    'permissions-page': 'p-6',
    'requests-page': 'p-6',
    'balance-page': 'p-6',

    'toolbar-card': 'mb-5 rounded-xl border border-white/6 bg-white/2 px-5 py-4',
    toolbar: 'flex flex-wrap items-center justify-between gap-3',
    'title-main': 'text-[18px] font-600 text-white',
    'title-sub': 'mt-1 text-[12px] text-white/50',

    'table-card': 'overflow-auto rounded-xl border border-white/6 bg-white/2',
    'uploads-card': 'mb-5',
    'data-table':
      '[--el-table-bg-color:transparent] [--el-table-tr-bg-color:transparent] [--el-table-header-bg-color:rgba(139,92,246,0.08)] [--el-table-row-hover-bg-color:rgba(139,92,246,0.08)] [--el-table-border-color:rgba(255,255,255,0.06)] [--el-table-text-color:rgba(255,255,255,0.85)] [--el-table-header-text-color:#a78bfa]',

    'id-tag': 'rounded bg-violet-500/15 px-2 py-0.5 text-[12px] font-500 text-violet-300',
    'user-cell': 'flex items-center gap-3',
    avatar:
      'h-9 w-9 flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[14px] font-600 text-white',
    'user-info': 'flex flex-col gap-0.5',
    username: 'font-500 text-white',
    nickname: 'text-[12px] text-white/50',
    reason: 'leading-[1.5] text-white/80',
    usage: 'font-500 text-white/80',
    time: 'text-[13px] text-white/50',

    'toolbar-actions': 'flex gap-2.5',
    'summary-card': 'mb-5 flex gap-4',
    'summary-item': 'flex-1 rounded-xl border border-white/6 bg-white/2 px-5 py-4',
    'summary-label': 'text-[12px] text-white/50',
    'summary-value': 'mt-1.5 block text-[20px] font-600 text-violet-300',
    pagination: 'flex justify-end px-4 pt-3 pb-4',
    empty: 'py-10 text-white/50',
  },
})
