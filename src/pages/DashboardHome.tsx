import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, TrendingDown, Activity, Euro, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function DashboardHome() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.goodMorning");
    if (h < 18) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startISO = startOfMonth.toISOString();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("usage_logs")
        .select("cost_eur")
        .eq("user_id", user!.id)
        .gte("created_at", startISO);

      const totalSpend = logs?.reduce((s, l) => s + (l.cost_eur || 0), 0) || 0;
      const totalRequests = logs?.length || 0;

      return { totalSpend, totalRequests };
    },
  });

  const { data: optimizationStats } = useQuery({
    queryKey: ["dashboard-optimization", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get user's conversation IDs for this month
      const { data: convos } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user!.id);

      if (!convos || convos.length === 0) return { moneySaved: 0, efficiencyPct: null };

      const convoIds = convos.map((c) => c.id);

      const { data: msgs } = await supabase
        .from("messages")
        .select("optimization_savings_eur, model_recommended")
        .in("conversation_id", convoIds)
        .eq("role", "assistant")
        .gte("created_at", startISO);

      const items = msgs || [];
      const moneySaved = items.reduce((s, m) => s + (Number(m.optimization_savings_eur) || 0), 0);

      const withModel = items.filter((m) => m.model_recommended);
      const flashCount = withModel.filter((m) =>
        m.model_recommended?.toLowerCase().includes("flash")
      ).length;
      const efficiencyPct = withModel.length > 0 ? Math.round((flashCount / withModel.length) * 100) : null;

      return { moneySaved, efficiencyPct };
    },
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, mode, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { title: t("dashboard.monthSpend"), value: `€${(stats?.totalSpend || 0).toFixed(2)}`, icon: Euro },
    { title: t("dashboard.requestsMade"), value: stats?.totalRequests || 0, icon: Activity },
    { title: t("dashboard.optimisationSavings"), value: `€${(optimizationStats?.moneySaved || 0).toFixed(2)}`, icon: TrendingDown },
    {
      title: t("dashboard.efficiency"),
      value: optimizationStats?.efficiencyPct != null ? `${optimizationStats.efficiencyPct}%` : "—",
      icon: Zap,
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <Card className="bg-[hsl(var(--surface-2))] border-border">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground text-tracking-tight">
              {getGreeting()}, {profile?.full_name || "there"} 👋
            </h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.activityOverview")}</p>
          </div>
          <Button onClick={() => navigate("/dashboard/chat")} className="glow-primary">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t("dashboard.newChat")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title} className="bg-[hsl(var(--surface-2))] border-border hover:border-primary/30 transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase text-tracking-wide">{s.title}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground text-tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[hsl(var(--surface-2))] border-border">
        <CardHeader>
          <CardTitle className="text-lg text-tracking-tight">{t("dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--surface-1))] border border-transparent cursor-pointer hover:border-primary/30 transition-all duration-200"
                  onClick={() => navigate(`/dashboard/chat?id=${conv.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{conv.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{conv.mode} {t("dashboard.mode")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t("dashboard.noActivityYet")}</p>
              <Button onClick={() => navigate("/dashboard/chat")} className="glow-primary">{t("dashboard.startChatting")}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
