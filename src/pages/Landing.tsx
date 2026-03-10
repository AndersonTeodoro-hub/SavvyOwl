import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Target, BookOpen, BarChart3, Check, Zap, ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Landing() {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Target,
      title: t("landing.smartRouting"),
      description: t("landing.smartRoutingDesc"),
    },
    {
      icon: BookOpen,
      title: t("landing.promptLibrary"),
      description: t("landing.promptLibraryDesc"),
    },
    {
      icon: BarChart3,
      title: t("landing.costDashboard"),
      description: t("landing.costDashboardDesc"),
    },
  ];

  const plans = [
    {
      name: t("landing.free"),
      price: "€0",
      period: t("landing.forever"),
      features: [t("landing.feat_20req"), t("landing.feat_quickOnly"), t("landing.feat_3prompts"), t("landing.feat_costTracking")],
      cta: t("landing.startFree"),
      popular: false,
    },
    {
      name: t("landing.starter"),
      price: "€19",
      period: t("landing.perMonth"),
      features: [t("landing.feat_300req"), t("landing.feat_allModes"), t("landing.feat_unlimitedPrompts"), t("landing.feat_fullAnalytics"), t("landing.feat_priorityEmail")],
      cta: t("landing.getStarter"),
      popular: true,
    },
    {
      name: t("landing.pro"),
      price: "€49",
      period: t("landing.perMonth"),
      features: [t("landing.feat_1500req"), t("landing.feat_allModes"), t("landing.feat_unlimitedPrompts"), t("landing.feat_advancedAnalytics"), t("landing.feat_prioritySupport"), t("landing.feat_customBudget")],
      cta: t("landing.getPro"),
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-foreground/[0.06] glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground text-tracking-tight">PromptOS</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary/50">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary/50">
                Pricing
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link to="/login">{t("landing.login")}</Link>
            </Button>
            <Button size="sm" className="glow-primary" asChild>
              <Link to="/register">{t("landing.startFree")}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-[hsl(215_40%_7%)] to-background animate-hero-gradient opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-8">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary text-tracking-wide uppercase">
                  {t("landing.smartRouting", "PLATAFORMA DE IA INTELIGENTE")}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-tracking-tight text-foreground mb-6 leading-[0.95]">
                {t("landing.hero")}{" "}
                <span className="gradient-text">{t("landing.heroHighlight")}</span>
                <br />
                {t("landing.heroSub")}
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                {t("landing.heroDesc")}
              </p>

              {/* CTAs */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <Button size="lg" className="text-base px-8 py-6 rounded-xl glow-primary" asChild>
                  <Link to="/register">
                    {t("landing.startFree")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-xl border-border hover:bg-secondary/50" asChild>
                  <Link to="/login">Ver demonstração</Link>
                </Button>
              </div>

              {/* Social proof */}
              <p className="text-sm text-muted-foreground">
                Já usado por <span className="text-foreground font-medium">2.300+</span> criadores e empresas
              </p>
            </motion.div>

            {/* Floating dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16 relative"
            >
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-[60px]" />
              <Card className="relative bg-card border-border rounded-2xl shadow-elevated overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex h-[300px] md:h-[400px]">
                    {/* Fake sidebar */}
                    <div className="w-48 border-r border-border bg-[hsl(var(--surface-1))] p-4 hidden md:block">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                          <Zap className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">PromptOS</span>
                      </div>
                      <div className="space-y-1">
                        {["Dashboard", "Chat", "Prompts", "Analytics"].map((item, i) => (
                          <div key={item} className={`text-xs px-3 py-2 rounded-lg ${i === 1 ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Fake chat */}
                    <div className="flex-1 flex flex-col">
                      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">New Chat</span>
                      </div>
                      <div className="flex-1 p-4 space-y-3">
                        <div className="flex justify-end">
                          <div className="bg-border rounded-2xl rounded-br-md px-4 py-2 max-w-[70%]">
                            <p className="text-sm text-foreground">Write an Instagram caption for my coffee brand</p>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-[hsl(var(--surface-2))] border-l-2 border-primary rounded-2xl rounded-bl-md px-4 py-2 max-w-[70%]">
                            <p className="text-sm text-foreground">☕ Elevate your morning ritual. Every sip, crafted with intention. #ArtisanCoffee #MorningMoments</p>
                            <span className="text-[10px] text-muted-foreground mt-1 block">gpt-5-mini • €0.0012</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-32">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-primary text-tracking-wide uppercase">Features</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-tracking-tight mt-3">
            {t("landing.smartRouting", "Everything you need")}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="bg-[hsl(var(--surface-2))] border-border hover:border-primary/50 transition-all duration-200 h-full group hover:glow-primary">
                <CardContent className="p-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3 text-tracking-tight">{b.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{b.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 pb-32">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-primary text-tracking-wide uppercase">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-tracking-tight mt-3">
            {t("landing.pricingTitle")}
          </h2>
          <p className="text-muted-foreground mt-3 text-lg">
            {t("landing.pricingSub")}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative bg-[hsl(var(--surface-2))] border-border transition-all duration-200 ${
                plan.popular ? "border-primary glow-primary" : "hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1 rounded-full text-tracking-wide uppercase">
                  {t("landing.mostPopular")}
                </div>
              )}
              <CardContent className="p-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase text-tracking-wide mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground text-tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full rounded-xl ${plan.popular ? "glow-primary" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/20 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-tracking-tight">PromptOS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PromptOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
