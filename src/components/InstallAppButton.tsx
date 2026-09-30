import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" button for the existing web manifest.
 *
 * Browsers only expose `beforeinstallprompt` when the app is actually
 * installable, so the button stays hidden everywhere else rather than showing a
 * dead control. The event must be captured synchronously during page load to be
 * usable, hence the module-level listener installed below.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((notify) => notify());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((notify) => notify());
  });
}

export function InstallAppButton({ className }: { className?: string }) {
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null);

  useEffect(() => {
    const notify = () => setCanInstall(deferredPrompt !== null);
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  if (!canInstall) return null;

  const install = async () => {
    const prompt = deferredPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={install}
    >
      <Download className="size-3.5" />
      <span className="hidden sm:inline">Install app</span>
    </Button>
  );
}
