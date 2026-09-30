import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  OPEN_ALERTS_EVENT,
  useGiveawayAlerts,
  type GiveawayAlertFeed,
} from "@/hooks/use-giveaway-alerts";
import { PLATFORM_GROUPS, type Giveaway } from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Prefs {
  browserEnabled: boolean;
  minWorth: number;
  platforms: string[];
  lastSeenAt: number | null;
}

/**
 * In-app alert preferences. Nothing leaves the browser: Grantdrop badges the
 * header bell and raises a toast while you have the app open. There is no
 * email, SMS or push channel, and no background service worker, so there is no
 * delivery that can happen while this tab is closed.
 */
export function NotificationSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const prefs = useQuery(api.notifications.getPrefs);

  // Seed the fields by remounting on the saved row rather than syncing state
  // inside an effect, so the form never flickers between two values.
  const seed = prefs
    ? `${prefs.browserEnabled}|${prefs.minWorth}|${prefs.platforms.join(",")}`
    : "loading";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsBody
        key={seed}
        prefs={prefs ?? null}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function SettingsBody({
  prefs,
  onClose,
}: {
  prefs: Prefs | null;
  onClose: () => void;
}) {
  const savePrefs = useMutation(api.notifications.savePrefs);
  const clearPrefs = useMutation(api.notifications.clearPrefs);

  const [enabled, setEnabled] = useState(prefs?.browserEnabled ?? false);
  const [minWorth, setMinWorth] = useState(prefs?.minWorth ?? 0);
  const [platforms, setPlatforms] = useState<string[]>(prefs?.platforms ?? []);
  const [isSaving, setIsSaving] = useState(false);

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
      if (!enabled) {
        // Delete rather than disable: the watermark goes with it, so a later
        // opt-in starts from a clean baseline instead of a stale one.
        await clearPrefs({});
        toast.success("In-app alerts turned off");
        onClose();
        return;
      }
      await savePrefs({ browserEnabled: true, minWorth, platforms });
      toast.success("Alerts are on", {
        description: "New matching giveaways will show up in this browser.",
      });
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save your settings.",
      );
    } finally {
      setIsSaving(false);
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
          Grantdrop flags new free games inside this browser: a badge on the
          header bell and a toast while the app is open. No email, no SMS, no
          push — nothing is sent anywhere.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 px-6 pb-6">
        {/* Master switch */}
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/80 bg-secondary/40 px-4 py-3.5">
          <div>
            <Label htmlFor="alerts-enabled" className="text-sm">
              In-app alerts
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {enabled
                ? "On — the bell badges when something matching your filters lands."
                : "Off — you will only see giveaways by browsing the board."}
            </p>
          </div>
          <Switch
            id="alerts-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="mt-0.5"
          />
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
            disabled={!enabled}
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
                    disabled={!enabled}
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

      <DialogFooter className="gap-2 border-t border-border/60 px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          {enabled ? "Save preferences" : "Turn off"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * Header control: a bell that shows the unread count, opens the list of new
 * giveaways, and offers a way into the settings dialog.
 */
export function NotificationButton() {
  const [listOpen, setListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const alerts = useGiveawayAlerts();

  // The toast's "View" action lives outside this component, so the bell opens
  // itself through a window event rather than shared context.
  useEffect(() => {
    const onOpen = () => setListOpen(true);
    window.addEventListener(OPEN_ALERTS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ALERTS_EVENT, onOpen);
  }, []);

  // Close the list before opening the dialog, so the two portals don't stack.
  const openSettings = () => {
    setListOpen(false);
    setSettingsOpen(true);
  };

  return (
    <>
      <Popover open={listOpen} onOpenChange={setListOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative size-9 shrink-0"
            aria-label={
              alerts.unreadCount > 0
                ? `New giveaway alerts, ${alerts.unreadCount} unread`
                : "New giveaway alerts"
            }
          >
            {alerts.enabled ? (
              <Bell className="size-4" />
            ) : (
              <BellOff className="size-4" />
            )}
            {alerts.unreadCount > 0 && (
              <Badge
                variant="default"
                className="absolute -right-1 -top-1 h-4 min-w-4 border-2 border-background px-1 text-[10px] leading-none font-semibold tabular-nums"
              >
                {alerts.unreadCount > 9 ? "9+" : alerts.unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[22rem] p-0">
          <AlertList alerts={alerts} onOpenSettings={openSettings} />
        </PopoverContent>
      </Popover>

      <NotificationSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}

function AlertList({
  alerts,
  onOpenSettings,
}: {
  alerts: GiveawayAlertFeed;
  onOpenSettings: () => void;
}) {
  if (!alerts.enabled) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium">Alerts are off</p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Turn them on and Grantdrop will badge this bell when a free game
          matching your filters lands, while you have the app open.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full gap-1.5"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-3.5" />
          Turn on alerts
        </Button>
      </div>
    );
  }

  if (alerts.items.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">You're all caught up</p>
          {alerts.isChecking && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Nothing new since your last visit. We re-check every few minutes while
          Grantdrop is open.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full gap-1.5 text-xs"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-3.5" />
          Alert settings
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">
            {alerts.items.length} new{" "}
            {alerts.items.length === 1 ? "giveaway" : "giveaways"}
          </p>
          <p className="text-[11px] text-muted-foreground">Since your last visit</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-3.5" />
          Settings
        </Button>
      </div>

      <ul className="max-h-[22rem] overflow-y-auto">
        {alerts.items.map((item) => (
          <li key={item.id}>
            <NewGiveawayRow giveaway={item} />
          </li>
        ))}
      </ul>

      <div className="border-t border-border/60 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={alerts.markAllRead}
        >
          <Check className="size-3.5" />
          Mark all as read
        </Button>
      </div>
    </div>
  );
}

function NewGiveawayRow({ giveaway }: { giveaway: Giveaway }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/50">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border/70">
        <img
          src={giveaway.thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight">
          {giveaway.name}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="size-3 shrink-0 text-primary" />
          {giveaway.store}
          {giveaway.worthAmount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="hud-num font-semibold text-primary">
                ${Math.round(giveaway.worthAmount)}
              </span>
            </>
          )}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 text-xs"
        onClick={() =>
          window.open(giveaway.url, "_blank", "noopener,noreferrer")
        }
      >
        <ExternalLink className="size-3.5" />
        Get
      </Button>
    </div>
  );
}
