import { useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, BookOpen, BarChart3, Settings } from "lucide-react";

const items = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/dashboard/chat", icon: MessageSquare, label: "Chat" },
  { path: "/dashboard/prompts", icon: BookOpen, label: "Prompts" },
  { path: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[hsl(var(--surface-1))] border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] gap-0.5 transition-colors ${
              isActive(item.path) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
