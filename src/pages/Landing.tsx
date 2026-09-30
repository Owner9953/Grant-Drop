import { GiveawayCard, GiveawayCardSkeleton } from "@/components/GiveawayCard";
import { GiveawayDetailDialog } from "@/components/GiveawayDetailDialog";
import { Wordmark } from "@/components/Wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNow } from "@/hooks/use-now";
import { GiveawaySearch } from "@/components/GiveawaySearch";
import {
  DEFAULT_FILTERS,
  formatFreshness,
  useFeaturedGiveaways,
  useGiveaways,
} from "@/hooks/use-giveaways";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import {
  GIVEAWAY_SORTS,
  PLATFORM_GROUPS,
  type Giveaway,
} from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Gift,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const LIVE_PAGE_SIZE = 9;
const NO_IDS: number[] = [];

const FEATURES = [
  {
    icon: Gift,
    title: "Every claim, one feed",
    body: "Steam, Epic, GOG, itch.io, Xbox, PlayStation, Nintendo, Android, iOS and DRM-free drops all pulled into a single board.",
  },
  {
    icon: Compass,
    title: "Filters that actually filter",
    body: "Narrow by any of the eleven platforms, by offer type, or sort by raw dollar value. Search by name and the whole board re-ranks instantly.",
  },
  {
    icon: BookmarkCheck,
    title: "A library you keep",
    body: "Save the offers you're eyeing and they stay in your account, with a countdown on each one so nothing expires unnoticed.",
  },
  {
    icon: Zap,
    title: "Fresh every visit",
    body: "The feed is fetched server-side and cached for five minutes, so pages load fast. If the upstream service drops out, Grantdrop keeps serving the last good list and tells you it's doing so.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your free account",
    body: "One email, no card, no trial that quietly bills you. Your saved library is tied to it.",
  },
  {
    step: "02",
    title: "Scan what's live",
    body: "Open the hub and see every active giveaway, newest first, with the deadline and retail value on each card. Re-sort by value or popularity whenever you like.",
  },
  {
    step: "03",
    title: "Save, then claim",
    body: "Bookmark the ones you want, follow the countdown, then use Claim to jump straight to the store's own page before the offer expires.",
  },
];

/** Chips for the platform strip, keyed to the filter values on the live board. */
const TICKER = PLATFORM_GROUPS.filter((item) => item.value !== "all");

/** DRM-free is our differentiator, so it gets its own icon in the strip. */
const TICKER_ICON: Record<string, typeof ShieldCheck | null> = {
  "drm-free": ShieldCheck,
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Hero stat only: what the most valuable offers on the board are worth.
  const { giveaways: topOffers } = useFeaturedGiveaways(8);
  const totalWorth = topOffers.reduce((sum, item) => sum + item.worthAmount, 0);

  // The live board is fully browsable signed-out.
  const [platform, setPlatform] = useState(DEFAULT_FILTERS.platform);
  // Alias so the platform strip and the board's <Select> read the same value
  // without shadowing the `platform` loop variable inside the strip map.
  const platformFilter = platform;
  const [sortBy, setSortBy] = useState(DEFAULT_FILTERS.sortBy);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Giveaway | null>(null);

  const { giveaways, total, fetchedAt, trendingIds, isLoading, error } =
    useGiveaways(
      { platform, type: DEFAULT_FILTERS.type, sortBy, search },
      page,
      LIVE_PAGE_SIZE,
    );

  const now = useNow();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Returns [] for signed-out visitors, so bookmarks simply read as unsaved.
  const savedIds = useQuery(api.library.savedIds) ?? NO_IDS;
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const toggleSaved = useMutation(api.library.toggleSaved);

  const handleToggleSave = async (giveaway: Giveaway) => {
    if (!isAuthenticated) {
      toast("Sign in to keep giveaways in your library", {
        description: "Browsing stays free and unlimited.",
        action: {
          label: "Sign in",
          onClick: () => navigate("/auth?returnTo=/"),
        },
      });
      return;
    }
    try {
      const result = await toggleSaved({
        giveawayId: giveaway.id,
        name: giveaway.name,
        store: giveaway.store,
        worth: giveaway.worth,
        thumbnail: giveaway.thumbnail,
        image: giveaway.image,
        url: giveaway.url,
        endsAt: giveaway.endsAt ?? undefined,
      });
      toast.success(
        result.saved
          ? `${giveaway.name} saved to your library`
          : `${giveaway.name} removed from your library`,
      );
    } catch {
      toast.error("Could not update your library.");
    }
  };

  return (
    <div className="game-backdrop min-h-dvh bg-background text-foreground">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 pt-safe backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/" aria-label="Grantdrop home" className="min-w-0">
            <Wordmark />
          </Link>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#live" className="transition-colors hover:text-foreground">
              Live offers
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <InstallAppButton className="hidden sm:inline-flex" />
            <ThemeToggle />
            {isAuthenticated ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/dashboard">
                  <span className="hidden xs:inline">Open </span>hub
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/auth?returnTo=/dashboard">
                    <span className="hidden xs:inline">Browse freebies</span>
                    <span className="xs:hidden">Browse</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* --------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-14 sm:px-5 sm:pb-20 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 border-primary/40 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
            >
              <Sparkles className="size-3.5" />
              Live feed · checked every 5 minutes
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
              Every free game,
              <br />
              <span className="text-sweep">every platform.</span>
            </h1>
            <p className="text-balance mx-auto mt-6 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Grantdrop pulls active giveaways from every major storefront — PC,
              console and mobile — into a single feed. New drops land first, or
              sort by dollar value, then save what you want before the timer runs
              out.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 w-full px-6 sm:w-auto">
                <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard"}>
                  {isAuthenticated ? "Open your hub" : "Start collecting free games"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 w-full px-6 sm:w-auto">
                <a href="#live">See what's live</a>
              </Button>
            </div>

            <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70">
              {[
                {
                  // Counted from the feed, never asserted: the board's own
                  // total is the only number here that can go stale. Tapping a
                  // platform in the strip below re-scopes it, and the label
                  // follows so the figure is never ambiguous.
                  label:
                    platform === DEFAULT_FILTERS.platform
                      ? "Live right now"
                      : `Live on ${PLATFORM_GROUPS.find((item) => item.value === platform)?.label ?? "all"}`,
                  value: total > 0 ? String(total) : "—",
                  hint:
                    platform === DEFAULT_FILTERS.platform
                      ? "across every storefront"
                      : "matching your filter",
                  Icon: Zap,
                  live: true,
                },
                {
                  label: "Worth of top deals",
                  value: totalWorth > 0 ? `$${Math.round(totalWorth)}` : "—",
                  hint: "the 8 priciest",
                  Icon: Flame,
                  tone: true,
                },
                {
                  label: "Cost to join",
                  value: "$0",
                  hint: "no card, no trial",
                  Icon: ShieldCheck,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col bg-card/80 px-3 py-5 backdrop-blur-sm transition-colors hover:bg-secondary/50 sm:px-5"
                >
                  <dt className="flex items-start gap-1.5 text-[10px] font-medium uppercase leading-[1.35] tracking-[0.06em] text-muted-foreground xs:text-[11px] xs:tracking-[0.08em]">
                    {stat.live ? (
                      <span className="relative mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                        <span className="absolute size-2 animate-ping rounded-full bg-primary/70" />
                        <span className="size-1.5 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <stat.Icon
                        className={cn(
                          "mt-px size-3.5 shrink-0",
                          stat.tone && "text-primary",
                        )}
                      />
                    )}
                    <span>{stat.label}</span>
                  </dt>
                  <dd
                    className={cn(
                      "hud-num mt-1.5 text-xl font-semibold tracking-tight xs:text-2xl",
                      stat.tone && "text-primary",
                    )}
                  >
                    {stat.value}
                  </dd>
                  <p className="mt-1 hidden text-[11px] leading-4 text-muted-foreground/80 sm:block">
                    {stat.hint}
                  </p>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------ Platform strip */}
      <section
        aria-label="Supported platforms"
        className="sticky top-16 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl"
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-2">
              <span className="kicker">Indexed on</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                tap a platform to filter the board
              </span>
            </div>

            <div className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
              {TICKER.map((platform) => {
                const Icon = TICKER_ICON[platform.value];
                const isActive = platform.value === platformFilter;
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => {
                      setPlatform(platform.value);
                      setPage(1);
                      document
                        .getElementById("live")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium tracking-tight transition-colors duration-200 xs:px-2.5 xs:py-1.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/70 bg-card/60 text-muted-foreground pointer-fine:hover:-translate-y-px pointer-fine:hover:border-primary/40 pointer-fine:hover:bg-card pointer-fine:hover:text-foreground",
                    )}
                  >
                    {Icon && <Icon className="size-3.5 shrink-0" />}
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Offers */}
      <section id="live" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="kicker">Live right now</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Every active giveaway, newest first
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Pulled live from the GamerPower giveaway feed. Browse, search and
              filter the whole board right here — no account needed. Sign in only
              if you want to save offers to a library.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 gap-1.5 self-start sm:self-auto">
            <Link to="/auth?returnTo=/dashboard">
              View the full hub
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Anonymous toolbar: search, store filter and sort all work signed-out. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <GiveawaySearch
            value={search}
            onChange={handleSearchChange}
            resultCount={isLoading ? undefined : total}
            className="sm:max-w-sm"
          />

          <Select
            value={platform}
            onValueChange={(value) => {
              setPlatform(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter by store"
              className="h-10 w-full bg-card text-sm sm:w-[168px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_GROUPS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as typeof sortBy);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Sort giveaways"
              className="h-10 w-full bg-card text-sm sm:w-[168px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GIVEAWAY_SORTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: LIVE_PAGE_SIZE }).map((_, index) => (
                <GiveawayCardSkeleton key={index} />
              ))
            : giveaways.map((giveaway, index) => (
                <motion.div
                  key={giveaway.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <GiveawayCard
                    giveaway={giveaway}
                    isSaved={savedSet.has(giveaway.id)}
                    isTrending={trendingIds.has(giveaway.id)}
                    onToggleSave={handleToggleSave}
                    onSelect={setSelected}
                  />
                </motion.div>
              ))}
        </div>

        {!isLoading && giveaways.length === 0 && (
          <div className="surface-card mt-6 px-6 py-14 text-center">
            <h3 className="text-base font-semibold tracking-tight">
              {error ? "The feed is taking a moment" : "Nothing matches that yet"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {error
                ? "GamerPower isn't responding. Try again in a moment."
                : "Try a different store or clear the search to see the full board."}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => {
                setSearch("");
                setPlatform(DEFAULT_FILTERS.platform);
                setSortBy(DEFAULT_FILTERS.sortBy);
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        )}

        {giveaways.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <span className="text-center text-sm tabular-nums text-muted-foreground">
              Showing {(page - 1) * LIVE_PAGE_SIZE + 1}–
              {Math.min(page * LIVE_PAGE_SIZE, total)} of {total}
              {fetchedAt && (
                <span className="ml-2">· Updated {formatFreshness(fetchedAt, now)}</span>
              )}
            </span>
            <div className="flex w-full items-center gap-2 xs:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 xs:flex-none"
                disabled={page === 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 xs:flex-none"
                disabled={isLoading || page * LIVE_PAGE_SIZE >= total}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Browsing works without an account.{" "}
          <Link
            to={isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard"}
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            {isAuthenticated ? "Open your saved library" : "Sign in to save offers"}
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section id="features" className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="max-w-xl">
            <p className="kicker">Built for collectors</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              A quieter way to track free games
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="surface-card p-6">
                <div className="mb-4 grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="kicker">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Three steps to a bigger library
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              No subscriptions, no credit card, no "premium tier". The only thing
              Grantdrop asks for is an email address so your saves survive a
              refresh.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Free account, no payment details",
                "Save offers to a library that follows you",
                "Countdowns on every deal so nothing slips",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <ol className="space-y-4">
            {STEPS.map((item) => (
              <li key={item.step} className="surface-card flex gap-5 p-6">
                <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="border-t border-border/60 bg-foreground text-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 grid size-12 place-items-center rounded-xl bg-background/10">
              <LayoutGrid className="size-6" />
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Your next free game is sitting on the board right now
            </h2>
            <p className="text-balance mx-auto mt-4 max-w-lg text-[15px] leading-7 text-background/70">
              Create an account and start building a library across PC, console
              and mobile that would otherwise cost hundreds of dollars.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 w-full bg-background px-6 text-foreground hover:bg-background/90 sm:w-auto"
              >
                <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=/dashboard"}>
                  {isAuthenticated ? "Open your hub" : "Get started free"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full border-background/25 bg-transparent px-6 text-background hover:bg-background/10 hover:text-background sm:w-auto"
              >
                <a href="#live">
                  <BellRing className="size-4" />
                  Browse first
                </a>
              </Button>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-xs text-background/50">
              <ShieldCheck className="size-3.5" />
              Claims are completed on the publisher's own store — Grantdrop never
              asks for your account details.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Footer */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 pb-safe sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Wordmark />
          <p className={cn("text-xs text-muted-foreground")}>
            Giveaway data provided by GamerPower. Always confirm eligibility on the
            store page before claiming.
          </p>
        </div>
      </footer>

      <GiveawayDetailDialog
        giveaway={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        isSaved={selected ? savedSet.has(selected.id) : false}
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}
