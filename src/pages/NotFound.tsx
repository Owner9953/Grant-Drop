import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="game-backdrop flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-5">
          <Link to="/" aria-label="Grantdrop home">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="surface-card w-full max-w-lg px-6 py-12 text-center sm:px-10"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Compass className="size-6" />
          </div>
          <p className="kicker mt-6 justify-center">Error 404</p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            This page isn't on the board
          </h1>
          <p className="text-balance mx-auto mt-3 max-w-sm text-[15px] leading-7 text-muted-foreground">
            The link may be stale, or the offer it pointed at has already been
            claimed. The live giveaway feed is still running.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="h-11 w-full gap-1.5 sm:w-auto">
              <Link to="/">
                Back to live offers
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
              <Link to="/dashboard">Open your hub</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
