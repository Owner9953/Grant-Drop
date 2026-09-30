import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

/** Only same-origin paths may be used as a post-auth destination. */
function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

const PROMISES = [
  "No password — we email you a one-time code",
  "Your saved library follows the account, not the device",
  "Free forever, and we never ask for store credentials",
];

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn("email-otp", new FormData(event.currentTarget));
      navigate(redirect, { replace: true });
    } catch {
      setError("That code isn't right. Check it and try again.");
      setOtp("");
      setIsLoading(false);
    }
  };

  const isOtpStep = step !== "signIn";

  return (
    <div className="game-backdrop flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top bar: a way back out, and the theme toggle, on every screen size. */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/" aria-label="Grantdrop home" className="min-w-0">
            <Wordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {!isOtpStep && (
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link to="/">Back to live board</Link>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-5 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center sm:mb-8">
            <p className="kicker justify-center">Free account</p>
            <h1 className="mt-3 text-balance text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {isOtpStep ? "Enter your code" : "Sign in to Grantdrop"}
            </h1>
            <p className="text-balance mx-auto mt-2.5 max-w-sm text-sm leading-6 text-muted-foreground">
              {isOtpStep
                ? `We sent a six-digit code to ${step.email}.`
                : "One email, no password, no card. Your library syncs the moment you're in."}
            </p>
          </div>

          <Card className="surface-card gap-0 overflow-hidden py-0">
            {isOtpStep ? (
              <form onSubmit={handleOtpSubmit} className="contents">
                <CardContent className="p-6">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          otp.length === 6 &&
                          !isLoading
                        ) {
                          // Submit the surrounding form once the code is full,
                          // so a sixth digit doesn't need a second Enter press.
                          const form = (event.target as HTMLElement).closest(
                            "form",
                          );
                          if (form) form.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mt-4 text-center text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="mt-6 h-11 w-full gap-2"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      <>
                        Verify code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep("signIn");
                      setOtp("");
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="mt-2 w-full"
                  >
                    Use a different email
                  </Button>
                </CardContent>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit} className="contents">
                <CardContent className="p-6">
                  <label
                    htmlFor="auth-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email address
                  </label>
                  <div className="relative mt-2">
                    <Mail
                      aria-hidden
                      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="auth-email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="h-11 pl-10"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="mt-3 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="mt-4 h-11 w-full gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending code
                      </>
                    ) : (
                      <>
                        Email me a code
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            )}
          </Card>

          {!isOtpStep && (
            <ul className="mt-6 space-y-2.5">
              {PROMISES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] leading-5 text-muted-foreground"
                >
                  <CheckCircle2 className="mt-px size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Grantdrop never sees your store login. Claims happen on the
            publisher's own site.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
