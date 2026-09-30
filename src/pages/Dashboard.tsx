import { GiveawayCard, GiveawayCardSkeleton } from "@/components/GiveawayCard";
import { GiveawayDetailDialog } from "@/components/GiveawayDetailDialog";
import { Wordmark } from "@/components/Wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { CalendarAgenda } from "@/components/CalendarAgenda";
import { InstallAppButton } from "@/components/InstallAppButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ValueExplainer } from "@/components/ValueExplainer";
import { downloadCsv, toCsv } from "@/lib/library-csv";
import { useListNavigation, useNow, useSearchHotkey } from "@/hooks/use-now";
import {
  DEFAULT_FILTERS,
  formatFreshness,
  useGiveaways,
} from "@/hooks/use-giveaways";
import { api } from "@/convex/_generated/api";
import {
  GIVEAWAY_SORTS,
  GIVEAWAY_TYPES,
  PLATFORM_GROUPS,
  type Giveaway,
} from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  LayoutGrid,
  LogOut,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const PAGE_SIZE = 12;
const NO_IDS: number[] = [];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [platform, setPlatform] = useState(DEFAULT_FILTERS.platform);
  const [type, setType] = useState(DEFAULT_FILTERS.type);
  const [sortBy, setSortBy] = useState(DEFAULT_FILTERS.sortBy);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"browse" | "library">("browse");
  const [libraryFilter, setLibraryFilter] = useState<"saved" | "claimed">("saved");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selected, setSelected] = useState<Giveaway | null>(null);

  const filters = useMemo(
    () => ({ platform, type, sortBy, search }),
    [platform, type, sortBy, search],
  );
  const { giveaways, total, stale, fetchedAt, trendingIds, isLoading, error } =
    useGiveaways(filters, page, PAGE_SIZE, refreshToken);

  const searchRef = useSearchHotkey<HTMLInputElement>();
  const now = useNow();
  const { activeIndex, itemRefs } = useListNavigation(giveaways.length);

  // Always subscribed so save state stays live on the grid without refetching.
  const savedIds = useQuery(api.library.savedIds) ?? NO_IDS;
  const toggleSaved = useMutation(api.library.toggleSaved);
  const setClaimed = useMutation(api.library.setClaimed);

  const savedList = useQuery(api.library.listSaved);
  const claimedSet = useMemo(
    () =>
      new Set(
        (savedList ?? [])
          .filter((item) => item.claimedAt !== null)
          .map((item) => item.giveawayId),
      ),
    [savedList],
  );

  const handleToggleClaimed = async (giveaway: Giveaway) => {    const next = !claimedSet.has(giveaway.id);
    try {
      await setClaimed({ giveawayId: giveaway.id, claimed: next });
      toast.success(
        next
          ? `${giveaway.name} moved to Claimed`
          : `${giveaway.name} moved back to Saved`,
      );
    } catch {
      toast.error("Could not update that giveaway.");
    }
  };

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleToggleSave = async (giveaway: Giveaway) => {
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update your library.",
      );
    }
  };

  const handleExportCsv = () => {
    if (!savedList || savedList.length === 0) return;
    const csv = toCsv(
      savedList.map((item) => ({
        name: item.name,
        store: item.store,
        worth: item.worth,
        platforms: item.store,
        endsAt: item.endsAt,
        savedAt: item.savedAt,
        claimedAt: item.claimedAt,
      })),
    );
    downloadCsv("grantdrop-library.csv", csv);
    toast.success(`Exported ${savedList.length} saved offers`);
  };

  const resetFilters = () => {
    setPlatform(DEFAULT_FILTERS.platform);
    setType(DEFAULT_FILTERS.type);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setSearch("");
    setPage(1);
  };

  const showLibrary = tab === "library";
  const sortLabel =
    GIVEAWAY_SORTS.find((option) => option.value === sortBy)?.label ??
    "Newest first";
  const hasActiveFilters =
    platform !== DEFAULT_FILTERS.platform ||
    type !== DEFAULT_FILTERS.type ||
    sortBy !== DEFAULT_FILTERS.sortBy ||
    search.length > 0;

  return (
    <div className="game-backdrop min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------- Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-5">
          <Link to="/" aria-label="Grantdrop home">
            <Wordmark />
          </Link>

          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search giveaways"
              aria-label="Search giveaways"
              className="h-9 bg-secondary/60 pl-9 pr-14 text-sm"
            />
            <kbd className="pointer-events-none absolute right-2.5 inline-flex select-none items-center rounded border border-border/70 bg-card/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <InstallAppButton className="hidden sm:inline-flex" />
            <ThemeToggle />
            <span className="hidden text-sm text-muted-foreground lg:inline">
              {user?.name || user?.email || "Signed in"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSignOut}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-8">
        {/* ---------------------------------------------------------- Heading */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kicker">
              <Sparkles className="size-3.5" />
              Free games hub
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Live giveaways, one board
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">
              {showLibrary
                ? "Everything you've saved, newest first. Remove anything you've already claimed."
                : `Active free-to-keep offers across every major storefront, ${sortLabel.toLowerCase()}.`}
            </p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "browse" | "library")}
          >
            <TabsList className="h-10 rounded-lg bg-secondary/70 p-1">
              <TabsTrigger value="browse" className="gap-1.5 rounded-md px-3 text-sm">
                Browse
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-1.5 rounded-md px-3 text-sm">
                <Bookmark className="size-3.5" />
                My library
                {!showLibrary && savedIds.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-5 min-w-5 border-0 bg-background px-1.5 text-[11px] tabular-nums"
                  >
                    {savedIds.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ---------------------------------------------------------- Filters */}
        {!showLibrary && (
          <div className="mt-8 space-y-4">
            <div className="relative md:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search giveaways"
                aria-label="Search giveaways"
                className="h-10 bg-secondary/60 pl-9"
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap items-center gap-1.5">
                {[{ label: "All", value: "" }, ...GIVEAWAY_TYPES.map((item) => ({ label: item, value: item.toLowerCase() }))].map((item) => (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => {
                      setType(item.value);
                      setPage(1);
                    }}
                    aria-pressed={type === item.value}
                    className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                      type === item.value
                        ? "border-transparent bg-foreground text-background"
                        : "border-border/80 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <Select
                  value={platform}
                  onValueChange={(value) => {
                    setPlatform(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Filter by store"
                    className="h-9 w-[168px] rounded-lg bg-card text-sm"
                  >
                    <SlidersHorizontal className="size-3.5 text-muted-foreground" />
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
                    className="h-9 w-[168px] rounded-lg bg-card text-sm"
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

                {sortBy === "value" && <ValueExplainer />}

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground"
                    onClick={resetFilters}
                  >
                    Reset
                  </Button>
                )}

                <div
                  className="flex h-9 items-center gap-0.5 rounded-lg border border-border/80 bg-card p-0.5"
                  role="group"
                  aria-label="Switch between list and calendar view"
                >
                  {(
                    [
                      { key: "list", label: "List", icon: LayoutGrid },
                      { key: "calendar", label: "Calendar", icon: CalendarDays },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setView(option.key)}
                      aria-pressed={view === option.key}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                        view === option.key
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <option.icon className="size-3.5" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}          {showLibrary && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {(["saved", "claimed"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLibraryFilter(key)}
                  aria-pressed={libraryFilter === key}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-[13px] font-medium capitalize transition-colors",
                    libraryFilter === key
                      ? "border-transparent bg-foreground text-background"
                      : "border-border/80 bg-card text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-8 gap-1.5 text-xs"
              onClick={handleExportCsv}
              disabled={!savedList || savedList.length === 0}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        )}

        {/* Announce result-count changes to screen readers without stealing focus. */}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {isLoading
            ? "Loading giveaways"
            : showLibrary
              ? `${savedList?.length ?? 0} saved offers`
              : `${total} giveaways found`}
        </p>

        {/* ------------------------------------------------------------- Grid */}
        <div className="mt-8">
          {!showLibrary && stale && giveaways.length > 0 && (
            <p className="mb-5 rounded-lg border border-border/70 bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">
              Showing the last known list while the feed reconnects.
            </p>
          )}
          {showLibrary ? (
            <LibraryGrid
              onSelect={setSelected}
              onToggleSave={handleToggleSave}
              onToggleClaimed={handleToggleClaimed}
              filter={libraryFilter}
            />
          ) : error ? (
            <EmptyState
              title="Couldn't reach the giveaway feed"
              body="The upstream service isn't responding right now. Give it a moment and try again."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRefreshToken((token) => token + 1)}
                >
                  Try again
                </Button>
              }
            />
          ) : (
            <>
              {view === "calendar" ? (
                <CalendarAgenda giveaways={giveaways} isLoading={isLoading} />
              ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                      <GiveawayCardSkeleton key={index} />
                    ))
                  : giveaways.map((giveaway, index) => (
                      <GiveawayCard
                        key={giveaway.id}
                        giveaway={giveaway}
                        isSaved={savedSet.has(giveaway.id)}
                        isClaimed={claimedSet.has(giveaway.id)}
                        isTrending={trendingIds.has(giveaway.id)}
                        onToggleSave={handleToggleSave}
                        onToggleClaimed={handleToggleClaimed}
                        onSelect={setSelected}
                        itemIndex={index}
                        isActiveItem={index === activeIndex}
                        onItemRef={(position, node) => {
                          itemRefs.current[position] = node;
                        }}
                      />
                    ))}
              </div>
              )}

              {!isLoading && giveaways.length === 0 && (
                <EmptyState
                  title="No giveaways match those filters"
                  body="Try a different store, clear the search, or widen the offer type."
                  action={
                    <Button type="button" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  }
                />
              )}                  {giveaways.length > 0 && (
                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <p className="hidden text-xs text-muted-foreground lg:block">
                    Tip: press{" "}
                    <kbd className="rounded border border-border/70 bg-secondary/60 px-1 py-0.5 font-mono text-[10px]">J</kbd>{" "}
                    /{" "}
                    <kbd className="rounded border border-border/70 bg-secondary/60 px-1 py-0.5 font-mono text-[10px]">K</kbd>{" "}
                    to move, <kbd className="rounded border border-border/70 bg-secondary/60 px-1 py-0.5 font-mono text-[10px]">↵</kbd>{" "}
                    for details
                  </p>
              <span className="text-sm tabular-nums text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
                {fetchedAt && (
                  <span className="ml-2">
                    · Updated {formatFreshness(fetchedAt, now)}
                  </span>
                )}
              </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      disabled={isLoading || page * PAGE_SIZE >= total}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <GiveawayDetailDialog
        giveaway={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        isSaved={selected ? savedSet.has(selected.id) : false}
        isClaimed={selected ? claimedSet.has(selected.id) : false}
        onToggleSave={handleToggleSave}
        onToggleClaimed={handleToggleClaimed}
      />
    </div>
  );
}

/** The signed-in user's saved offers, split into still-hunting vs redeemed. */
function LibraryGrid({
  onSelect,
  onToggleSave,
  onToggleClaimed,
  filter,
}: {
  onSelect: (giveaway: Giveaway) => void;
  onToggleSave: (giveaway: Giveaway) => void;
  onToggleClaimed: (giveaway: Giveaway) => void;
  filter: "saved" | "claimed";
}) {
  const saved = useQuery(api.library.listSaved);

  if (saved === undefined) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <GiveawayCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <EmptyState
        title="Your library is empty"
        body="Tap the bookmark on any offer to keep it here. Saved games show their deadline so you can claim before it lapses."
        icon={<Inbox className="size-5" />}
      />
    );
  }

  const rows = saved.filter((item) =>
    filter === "claimed" ? item.claimedAt !== null : item.claimedAt === null,
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        title={filter === "claimed" ? "Nothing claimed yet" : "Nothing left to claim"}
        body={
          filter === "claimed"
            ? "Once you redeem an offer, mark it claimed and it moves here so you always know what you still own."
            : "Every saved offer has been redeemed. Nice work."
        }
        icon={<Check className="size-5" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => (
        <GiveawayCard
          key={item.id}
          giveaway={{
            id: item.giveawayId,
            title: item.name,
            name: item.name,
            store: item.store,
            worth: item.worth,
            worthAmount: Number.parseFloat(item.worth.replace(/[^0-9.]/g, "")) || 0,
            thumbnail: item.thumbnail,
            image: item.image ?? item.thumbnail,
            description: "",
            instructions: "",
            url: item.url,
            platforms: [item.store],
            drmFree: false,
            endsAt: item.endsAt,
            endsAtRaw: "",
            publishedAt: null,
            users: 0,
            type: "Game",
            status: "Active",
          }}
          isSaved
          isClaimed={item.claimedAt !== null}
          onToggleSave={onToggleSave}
          onToggleClaimed={onToggleClaimed}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        {icon ?? <ChevronDown className="size-5" />}
      </div>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
