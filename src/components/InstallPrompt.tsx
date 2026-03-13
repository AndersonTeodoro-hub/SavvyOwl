import { useState, useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const dismissed = localStorage.getItem("savvyowl-install-dismissed");

  useEffect(() => {
    if (dismissed) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show after 30s or on custom event
    const timer = setTimeout(() => setShow(true), 30000);
    const trigger = () => setShow(true);
    window.addEventListener("install-prompt-trigger", trigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("install-prompt-trigger", trigger);
      clearTimeout(timer);
    };
  }, [dismissed]);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    setShow(false);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    localStorage.setItem("savvyowl-install-dismissed", "true");
    setShow(false);
  };

  if (!show || dismissed) return null;
  // Only show if we have a native prompt OR it's iOS
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[hsl(var(--surface-2))] border border-border rounded-2xl p-4 shadow-elevated animate-in slide-in-from-bottom-4 duration-300">
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-1">📲 Install SavvyOwl</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mb-3">Tap Share → Add to Home Screen for faster access</p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">Install on your device for faster access</p>
          )}
          <div className="flex gap-2">
            {!isIOS && (
              <Button size="sm" onClick={handleInstall} className="min-h-[44px] text-xs">
                Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="min-h-[44px] text-xs text-muted-foreground">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
