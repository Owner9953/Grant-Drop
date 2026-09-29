import { GiveawayCard, GiveawayCardSkeleton } from "@/components/GiveawayCard";
import { Wordmark } from "@/components/Wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeaturedGiveaways } from "@/hooks/use-giveaways";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookmarkCheck,
  Check,
  Compass,
  Gift,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

const FEATURES = [
  {
    icon: Gift,
    title: "Every claim, one feed",
    body: "Steam, Epic, GOG, itch.io, Ubisoft and more pulled into a single ranked board. No tab-hopping between storefronts.",
  },
  {
    icon: Compass,
    title: "Filters that actually filter",
    body: "Narrow by store, by offer type, or sort by raw dollar value. Search by name and the whole catalogue re-ranks instantly.",
  },
  {
    icon: BookmarkCheck,
    title: "A library you keep",
    body: "Save the offers you're eyeing and they stay in your account, with a countdown on each one so nothing expires unnoticed.",
  },
  {
    icon: Zap,
    title: "Fresh every visit",
    body: "The feed is fetched server-side on a short cache, so pages load fast without ever showing a stale giveaway.",
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
    body: "Open the hub and see every active giveaway ranked by what it's worth, with the deadline on each card.",
  },
  {
    step: "03",
    title: "Save, then claim",
    body: "Bookmark the ones you want, follow the countdown, and claim straight from the store before it expires.",
  },
];

const TICKER = [
  "Steam",
  "Epic Games",
  "GOG",
  "itch.io",
  "Ubisoft Connect",
  "EA App",
  "Game Pass",
  "PlayStation",
  "Nintendo",
  "iTunes",
];

export default function Landing() {
  const { giveaways, isLoading } = useFeaturedGiveaways(8);
  const { isAuthenticated } = useAuth();

  const totalWorth = giveaways.reduce((sum, item) => sum + item.worthAmount, 0);
  const featured = giveaways.slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------------------------------------------------------------- Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Grantdrop home">
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
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/dashboard">
                  Open hub
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
                    Browse freebies
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(60rem 32rem at 50% -18%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 border-border/70 bg-background/70 px-3 py-1 text-xs font-medium"
            >
              <Sparkles className="size-3.5 text-primary" />
              Live feed · refreshed continuously
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
              Every free PC game,
              <br />
              <span className="text-primary">on one clean board.</span>
            </h1>
            <p className="text-balance mx-auto mt-6 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Grantdrop pulls active giveaways from every major storefront into a
              single feed. New drops land first, or sort by dollar value — then
              save the ones you want before the timer runs out.
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
                { label: "Giveaways indexed", value: "1,900+" },
                {
                  label: "Top 6 value now",
                  value: totalWorth > 0 ? `$${Math.round(totalWorth)}` : "$0",
                },
                { label: "Cost to join", value: "$0" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card px-4 py-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------- Store ticker */}
      <section aria-label="Supported storefronts" className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {TICKER.map((store) => (
              <span
                key={store}
                className="text-[13px] font-medium tracking-tight text-muted-foreground"
              >
                {store}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Offers */}
      <section id="live" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              Live right now
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              The highest-value freebies on the board
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              Pulled live from the GamerPower giveaway feed and sorted by retail
              price. Inside the hub you can switch to newest-first, filter by
              store, search, and keep your own list.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 gap-1.5 self-start sm:self-auto">
            <Link to="/auth?returnTo=/dashboard">
              View the full hub
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <GiveawayCardSkeleton key={index} />
              ))
            : featured.map((giveaway, index) => (
                <motion.div
                  key={giveaway.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <GiveawayCard giveaway={giveaway} />
                </motion.div>
              ))}
        </div>

        {!isLoading && featured.length === 0 && (
          <p className="mt-10 rounded-xl border border-border/70 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            The feed is taking a moment to respond. Try again in a moment.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section id="features" className="scroll-mt-20 border-y border-border/60 bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              Built for collectors
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
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
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
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
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 grid size-12 place-items-center rounded-xl bg-background/10">
              <LayoutGrid className="size-6" />
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Your next free game is sitting on the board right now
            </h2>
            <p className="text-balance mx-auto mt-4 max-w-lg text-[15px] leading-7 text-background/70">
              Create an account and start building a library that would otherwise
              cost hundreds of dollars.
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className={cn("text-xs text-muted-foreground")}>
            Giveaway data provided by GamerPower. Always confirm eligibility on the
            store page before claiming.
          </p>
        </div>
      </footer>
    </div>
  );
}
