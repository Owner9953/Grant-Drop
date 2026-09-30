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
import { formatCountdown, PLATFORM_GROUPS } from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Hourglass,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

/** Live countdown for an expiring save, from the app-wide shared clock. */
function Countdown({ endsAt, className }: { endsAt: number | null; className?: string }) {
  const now = useNow();
  if (endsAt === null) return null;
  return (
    <>
      <span aria-hidden>·</span>
      <span
        className={cn(
          "hud-num shrink-0 whitespace-nowrap font-semibold",
          className,
        )}
      >
        {formatCountdown(endsAt, now)}
      </span>
    </>
  );
}

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
    <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
      <DialogHeader className="space-y-2 p-5 pb-4 sm:p-6 sm:pb-4">
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

      <div className="space-y-6 px-4 pb-6 sm:px-6">
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

      <DialogFooter className="gap-2 border-t border-border/60 px-4 py-4 sm:px-6">
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
            className="relative size-10 shrink-0 xs:size-9"
            aria-label={
              alerts.unreadCount > 0
                ? `Giveaway alerts, ${alerts.unreadCount} need you`
                : "Giveaway alerts"
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
        <PopoverContent
          align="end"
          sideOffset={8}
          // Keeps a real gutter when the panel has to shift to stay on screen,
          // which it always does on a phone narrower than the trigger offset.
          collisionPadding={12}
          // On a phone the panel is wider than the space to the left of the
          // bell, so it spans the viewport instead of drifting off the edge.
          className="w-[calc(100vw-1.5rem)] max-w-[22rem] p-0"
        >
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
  const hasExpiring = alerts.expiring.length > 0;
  const hasNew = alerts.enabled && alerts.items.length > 0;

  // Nothing needs you: pitch whichever state is relevant right now.
  if (!hasExpiring && !hasNew) {
    return alerts.enabled ? (
      <div className="p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">You're all caught up</p>
          {alerts.isChecking && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Nothing new since your last visit, and nothing in your library is
          about to expire. We re-check every few minutes while Grantdrop is open.
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
    ) : (
      <div className="p-4">
        <p className="text-sm font-medium">Alerts are off</p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Turn them on and Grantdrop will badge this bell when a free game
          matching your filters lands, while you have the app open. Saved offers
          are always checked for expiring deadlines either way.
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

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold">{alerts.unreadCount} need you</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={onOpenSettings}
        >
          <Settings2 className="size-3.5" />
          {alerts.enabled ? "Settings" : "Turn on"}
        </Button>
      </div>

      <div className="max-h-[min(24rem,58dvh)] overflow-y-auto">
        {/* Deadlines first: these are the offers that actually get missed. */}
        {hasExpiring && (
          <section>
            <h4 className="flex items-center gap-1.5 bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400">
              <Hourglass className="size-3.5" />
              Expiring from your library
            </h4>
            <ul>
              {alerts.expiring.map((save) => (
                <li key={save.giveawayId} className="border-t border-border/50">
                  <AlertRow
                    name={save.name}
                    store={save.store}
                    thumbnail={save.thumbnail}
                    url={save.url}
                    right={
                      <Countdown
                        endsAt={save.endsAt}
                        className="text-amber-600 dark:text-amber-400"
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasNew && (
          <section>
            <h4 className="flex items-center gap-1.5 bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              New since your last visit
            </h4>
            <ul>
              {alerts.items.map((item) => (
                <li key={item.id} className="border-t border-border/50">
                  <AlertRow
                    name={item.name}
                    store={item.store}
                    thumbnail={item.thumbnail}
                    url={item.url}
                    right={
                      item.worthAmount > 0 ? (
                        <span className="hud-num shrink-0 text-xs font-semibold text-primary">
                          ${Math.round(item.worthAmount)}
                        </span>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {hasNew && (
        <div className="border-t border-border/60 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={alerts.markAllRead}
          >
            <Check className="size-3.5" />
            Mark new offers as read
          </Button>
        </div>
      )}
    </div>
  );
}

function AlertRow({
  name,
  store,
  thumbnail,
  url,
  right,
}: {
  name: string;
  store: string;
  thumbnail: string;
  url: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-secondary/50">
      <div className="mt-0.5 size-11 shrink-0 overflow-hidden rounded-md border border-border/70 xs:size-14">
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        {/* Two lines rather than an ellipsis: at phone width a single truncated
            line hides the half of a game title that identifies it. */}
        <p className="line-clamp-2 text-[13px] font-medium leading-tight">
          {name}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="truncate">{store}</span>
          {right}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 gap-1.5 text-xs xs:h-8"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label={`Claim ${name} on ${store}`}
      >
        <ExternalLink className="size-3.5" />
        Get
      </Button>
    </div>
  );
}
