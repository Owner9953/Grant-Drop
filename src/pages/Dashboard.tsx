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
import { DEFAULT_FILTERS, useGiveaways } from "@/hooks/use-giveaways";
import { api } from "@/convex/_generated/api";
import {
  GIVEAWAY_SORTS,
  GIVEAWAY_TYPES,
  PLATFORM_FILTERS,
  type Giveaway,
} from "@/lib/giveaways";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark,
  ChevronDown,
  Inbox,
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
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selected, setSelected] = useState<Giveaway | null>(null);

  const filters = useMemo(
    () => ({ platform, type, sortBy, search }),
    [platform, type, sortBy, search],
  );
  const { giveaways, isLoading, error } = useGiveaways(
    filters,
    page,
    PAGE_SIZE,
    refreshToken,
  );

  // Always subscribed so save state stays live on the grid without refetching.
  const savedIds = useQuery(api.library.savedIds) ?? NO_IDS;
  const toggleSaved = useMutation(api.library.toggleSaved);

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

  const resetFilters = () => {
    setPlatform(DEFAULT_FILTERS.platform);
    setType(DEFAULT_FILTERS.type);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setSearch("");
    setPage(1);
  };

  const showLibrary = tab === "library";
  const hasActiveFilters =
    platform !== DEFAULT_FILTERS.platform ||
    type !== DEFAULT_FILTERS.type ||
    sortBy !== DEFAULT_FILTERS.sortBy ||
    search.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------- Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-5">
          <Link to="/" aria-label="Grantdrop home">
            <Wordmark />
          </Link>

          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search giveaways"
              aria-label="Search giveaways"
              className="h-9 bg-secondary/60 pl-9 pr-9 text-sm"
            />
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
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              <Sparkles className="size-3.5" />
              Free games hub
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Live giveaways, one board
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">
              {showLibrary
                ? "Everything you've saved, newest first. Remove anything you've already claimed."
                : "Active free-to-keep offers across every major storefront, ranked by retail value."}
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
                {GIVEAWAY_TYPES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setType(type === item.toLowerCase() ? "" : item.toLowerCase());
                      setPage(1);
                    }}
                    aria-pressed={type === item.toLowerCase()}
                    className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                      type === item.toLowerCase()
                        ? "border-transparent bg-foreground text-background"
                        : "border-border/80 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {item}
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
                    {PLATFORM_FILTERS.map((filter) => (
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
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- Grid */}
        <div className="mt-8">
          {showLibrary ? (
            <LibraryGrid
              onSelect={setSelected}
              onToggleSave={handleToggleSave}
            />
          ) : error ? (
            <EmptyState
              title="Couldn't reach the giveaway feed"
              body={error}
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                      <GiveawayCardSkeleton key={index} />
                    ))
                  : giveaways.map((giveaway) => (
                      <GiveawayCard
                        key={giveaway.id}
                        giveaway={giveaway}
                        isSaved={savedSet.has(giveaway.id)}
                        onToggleSave={handleToggleSave}
                        onSelect={setSelected}
                      />
                    ))}
              </div>

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
              )}

              {giveaways.length >= PAGE_SIZE && (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Page {page}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
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
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}

/** The signed-in user's saved offers, rendered from the Convex library table. */
function LibraryGrid({
  onSelect,
  onToggleSave,
}: {
  onSelect: (giveaway: Giveaway) => void;
  onToggleSave: (giveaway: Giveaway) => void;
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

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {saved.map((item) => (
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
            image: item.thumbnail,
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
          onToggleSave={onToggleSave}
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
