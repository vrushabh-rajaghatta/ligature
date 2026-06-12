
import { LayoutDashboard, Beaker, Inbox, Bot, Menu } from 'lucide-react';
import { ModuleId } from '@/types/core';
import { useTaskCounts } from '@/store/useTaskAggregationStore';

interface MobileBottomNavProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
  onOpenNav: () => void;
}

interface Tab {
  id: ModuleId | 'menu';
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'home',          label: 'Home',      icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'portfolio',     label: 'Portfolio', icon: <Beaker className="w-5 h-5" /> },
  { id: 'action-center', label: 'My Tasks',  icon: <Inbox className="w-5 h-5" /> },
  { id: 'agent-hub',     label: 'Agents',    icon: <Bot className="w-5 h-5" /> },
  { id: 'menu',          label: 'Menu',      icon: <Menu className="w-5 h-5" /> },
];

export function MobileBottomNav({ activeModule, onModuleChange, onOpenNav }: MobileBottomNavProps) {
  const taskCounts = useTaskCounts();
  const overdue = taskCounts?.overdue ?? 0;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-elevated border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-14">
        {TABS.map((tab) => {
          const isMenu = tab.id === 'menu';
          const isActive = !isMenu && activeModule === tab.id;
          const showBadge = tab.id === 'action-center' && overdue > 0;

          const handlePress = () => {
            if (isMenu) {
              onOpenNav();
            } else {
              onModuleChange(tab.id as ModuleId);
            }
          };

          return (
            <button
              key={tab.id}
              onClick={handlePress}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors relative ${
                isActive
                  ? 'text-violet-500'
                  : 'text-text-muted active:text-text-secondary'
              }`}
            >
              {/* Active pill background behind icon */}
              {isActive && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-7 bg-violet-500/12 rounded-full" />
              )}
              <span className="relative z-10">
                <span className="relative block">
                  {tab.icon}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {overdue > 9 ? '9+' : overdue}
                    </span>
                  )}
                </span>
              </span>
              <span className="leading-none relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
