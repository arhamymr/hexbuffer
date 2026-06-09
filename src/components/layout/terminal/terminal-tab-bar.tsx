import { PanelBottomClose, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TerminalTab {
  id: string
  name: string
}

interface TerminalTabBarProps {
  tabs: TerminalTab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
  onClosePanel: () => void
  isDark: boolean
}

export function TerminalTabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
  onClosePanel,
  isDark,
}: TerminalTabBarProps) {
  const bgBase = isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'
  const textBase = isDark ? 'text-[#c9d1d9]' : 'text-[#1f2328]'
  const textMuted = isDark ? 'text-[#6e7681]' : 'text-[#6e7781]'
  const activeBg = isDark ? 'bg-[#161b22]' : 'bg-[#ffffff]'
  const hoverBg = isDark ? 'hover:bg-[#161b22]/60' : 'hover:bg-[#ffffff]/60'
  const borderColor = isDark ? 'border-[#21262d]' : 'border-[#d0d7de]'

  return (
    <div
      className={cn(
        'flex items-center h-7 shrink-0 overflow-x-auto border-b',
        bgBase,
        textBase,
        borderColor,
      )}
    >
      <div className="flex items-center min-w-0 flex-1 gap-0.5 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={cn(
                'group flex items-center gap-1.5 px-2.5 h-6 text-[11px] rounded-t transition-colors shrink-0 max-w-[140px]',
                isActive ? activeBg : hoverBg,
              )}
            >
              <span className="truncate">{tab.name}</span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(tab.id)
                  }}
                  className={cn(
                    'flex items-center justify-center rounded-sm h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    isDark ? 'hover:bg-[#30363d]' : 'hover:bg-[#d0d7de]',
                  )}
                >
                  <X className="size-2.5" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center shrink-0 gap-0.5 mr-1.5">
        <button
          onClick={onAdd}
          className={cn(
            'flex items-center justify-center h-5 w-5 rounded transition-colors',
            textMuted,
            isDark ? 'hover:bg-[#21262d] hover:text-[#c9d1d9]' : 'hover:bg-[#d0d7de] hover:text-[#1f2328]',
          )}
          title="New terminal tab"
        >
          <Plus className="size-3" />
        </button>
        <button
          onClick={onClosePanel}
          className={cn(
            'flex items-center justify-center h-5 w-5 rounded transition-colors',
            textMuted,
            isDark ? 'hover:bg-[#21262d] hover:text-[#c9d1d9]' : 'hover:bg-[#d0d7de] hover:text-[#1f2328]',
          )}
          title="Close terminal panel"
        >
          <PanelBottomClose className="size-3" />
        </button>
      </div>
    </div>
  )
}
