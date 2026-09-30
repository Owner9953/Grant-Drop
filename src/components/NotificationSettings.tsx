import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api";
import { PLATFORM_GROUPS } from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { Bell, BellOff, Check, Loader2, Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Cadence = "off" | "daily" | "weekly";

const CADENCES: { value: Cadence; label: string; hint: string }[] = [
  { value: "off", label: "Off", hint: "No email" },
  { value: "daily", label: "Daily", hint: "Every morning" },
  { value: "weekly", label: "Weekly", hint: "Monday recap" },
];

/**
 * Opt-in email digests. Nothing is sent until the user picks a cadence and
 * supplies an address — there is no default-on subscription.
 *
 * The form lives in a child that is keyed on the saved row, so opening the
 * dialog seeds the fields from the server value by remounting rather than by
 * syncing state inside an effect.
 */
export function NotificationSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const prefs = useQuery(api.notifications.getPrefs);

  const seed = prefs
    ? `${prefs.digest}|${prefs.email ?? ""}|${prefs.minWorth}|${prefs.platforms.join(",")}`
    : "loading";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DigestForm
        key={seed}
        prefs={prefs ?? null}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function DigestForm({
  prefs,
  onClose,
}: {
  prefs: {
    email: string | null;
    digest: Cadence;
    minWorth: number;
    platforms: string[];
  } | null;
  onClose: () => void;
}) {
  const isConfigured = useAction(api.email.isConfigured);
  const savePrefs = useMutation(api.notifications.savePrefs);
  const sendTest = useAction(api.email.sendTestDigest);

  const [cadence, setCadence] = useState<Cadence>(prefs?.digest ?? "off");
  const [email, setEmail] = useState(prefs?.email ?? "");
  const [minWorth, setMinWorth] = useState(prefs?.minWorth ?? 0);
  const [platforms, setPlatforms] = useState<string[]>(prefs?.platforms ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isConfigured()
      .then((result) => {
        if (active) setConfigured(result.configured);
      })
      .catch(() => {
        if (active) setConfigured(null);
      });
    return () => {
      active = false;
    };
  }, [isConfigured]);
  const togglePlatform = (value: string) => {
    setPlatforms((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePrefs({
        email: email || undefined,
        digest: cadence,
        minWorth,
        platforms,
      });
      toast.success(
        cadence === "off"
          ? "Notifications turned off"
          : `You'll get a ${cadence} digest`,
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save your settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!email) {
      toast.error("Add an email address first");
      return;
    }
    setIsTesting(true);
    try {
      const result = await sendTest({ to: email });
      if ("sent" in result && result.sent) {
        toast.success("Test digest sent");
      } else {
        toast.error("Add a MailerSend API key to send real email");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send the test email.",
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 tracking-tight">
            <Bell className="size-5 text-primary" />
            New giveaway alerts
          </DialogTitle>
          <DialogDescription className="leading-6">
            Get an email when new free games match your filters. Opt-in only —
            we never send anything until you turn this on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          {configured === false && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-600 dark:text-amber-400">
              No MailerSend API key is configured yet, so saves are stored but
              nothing will actually be delivered. Add{" "}
              <code className="font-mono">MAILERSEND_API_KEY</code> to Convex
              env vars to go live.
            </div>
          )}

          {/* Cadence */}
          <div className="space-y-2.5">
            <Label>How often</Label>
            <div className="grid grid-cols-3 gap-2">
              {CADENCES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCadence(option.value)}
                  aria-pressed={cadence === option.value}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    cadence === option.value
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/80 hover:border-border hover:bg-secondary/50",
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="digest-email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="digest-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={cadence === "off"}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stored only to send your digest. Clearing the cadence removes it.
            </p>
          </div>

          {/* Minimum value */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Minimum value</Label>
              <span className="hud-num text-sm font-semibold text-primary">
                {minWorth === 0 ? "Any" : `$${minWorth}+`}
              </span>
            </div>
            <Slider
              value={[minWorth]}
              min={0}
              max={50}
              step={5}
              disabled={cadence === "off"}
              onValueChange={([next]) => setMinWorth(next)}
              aria-label="Minimum retail value"
            />
            <p className="text-xs text-muted-foreground">
              Skip anything cheaper than this. Offers with no listed price are
              always included.
            </p>
          </div>

          {/* Platforms */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <Label>Platforms</Label>
              {platforms.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={() => setPlatforms([])}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_GROUPS.filter((item) => item.value !== "all").map(
                (platform) => {
                  const active = platforms.includes(platform.value);
                  return (
                    <button
                      key={platform.value}
                      type="button"
                      disabled={cadence === "off"}
                      onClick={() => togglePlatform(platform.value)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                        active
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border/80 text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      {active && <Check className="size-3" />}
                      {platform.label}
                    </button>
                  );
                },
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {platforms.length === 0
                ? "Nothing selected means every platform."
                : `Only ${platforms.length} selected ${
                    platforms.length === 1 ? "platform" : "platforms"
                  }.`}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={isTesting || cadence === "off"}
            onClick={handleTest}
          >
            {isTesting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Send a test
          </Button>
          <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (cadence !== "off" && !email)}
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {cadence === "off" ? "Turn off" : "Save preferences"}
            </Button>
          </div>
        </DialogFooter>
    </DialogContent>
  );
}

/** Header button that opens the dialog and reflects the current state. */
export function NotificationButton() {
  const [open, setOpen] = useState(false);
  const prefs = useQuery(api.notifications.getPrefs);
  const active = prefs?.digest && prefs.digest !== "off";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9 shrink-0"
        aria-label="New giveaway alerts"
        onClick={() => setOpen(true)}
      >
        {active ? (
          <Bell className="size-4 text-primary" />
        ) : (
          <BellOff className="size-4" />
        )}
      </Button>
      <NotificationSettings open={open} onOpenChange={setOpen} />
    </>
  );
}
