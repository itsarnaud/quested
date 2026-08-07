"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WelcomeIllustration } from "@/components/icons/welcome-illustration";
import { CameraIcon } from "@/components/icons/camera-icon";
import { SteamLinkButton } from "@/app/[locale]/account/steam-link-button";
import { SteamSyncButton } from "@/app/[locale]/account/steam-sync-button";
import { uploadAvatar } from "@/app/[locale]/account/actions";

const STEP_COUNT = 4;

type Profile = { name: string | null; username: string | null; image: string | null };

export function OnboardingFlow({
  initialStep,
  profile,
  hasSteamLinked,
}: {
  initialStep: number;
  profile: Profile;
  hasSteamLinked: boolean;
}) {
  const t = useTranslations("Onboarding");

  const [step, setStep] = useState(Math.min(initialStep, STEP_COUNT - 1));
  const [addedCount, setAddedCount] = useState(0);

  const setOnboardingStep = trpc.user.setOnboardingStep.useMutation();
  const completeOnboarding = trpc.user.completeOnboarding.useMutation();

  const goTo = (next: number) => {
    setStep(next);
    setOnboardingStep.mutate({ step: next });
  };
  const onBack = step > 0 ? () => goTo(step - 1) : undefined;

  const finish = () => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        // A full navigation, not router.push: the layout (top nav, hidden
        // during onboarding) was server-rendered before this mutation, and
        // router.refresh() right before a push can lose the race against
        // the client Router Cache — leaving the nav missing until a manual
        // reload. A real navigation always re-renders it fresh.
        window.location.pathname = window.location.pathname.replace(/\/onboarding$/, "/search");
      },
      onError: () => toast.error(t("genericError")),
    });
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-10 px-6 py-14"
    >
      <motion.div variants={revealVariants} className="flex w-full items-center gap-2">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <motion.div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-border")}
            initial={false}
            animate={{ opacity: i <= step ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </motion.div>

      <motion.button
        variants={revealVariants}
        type="button"
        onClick={finish}
        className="fixed right-4 top-4 text-sm text-muted-foreground hover:text-foreground"
      >
        {t("skipAll")}
      </motion.button>

      {/* px-1: focus rings on full-width inputs/buttons sit flush against
          this container's edges and would otherwise get clipped by the
          overflow-hidden below (needed to mask the slide transition). */}
      <motion.div variants={revealVariants} className="w-full overflow-hidden px-1">
        {/* initial=false only skips this on step *changes*, not on the very
            first mount — that first appearance still animates in below. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex w-full flex-col items-center gap-8 text-center"
          >
            {step === 0 ? (
              <WelcomeStep onNext={() => goTo(1)} />
            ) : step === 1 ? (
              <ProfileStep profile={profile} onBack={onBack} onNext={() => goTo(2)} />
            ) : step === 2 ? (
              <GamesStep
                addedCount={addedCount}
                setAddedCount={setAddedCount}
                onBack={onBack}
                onNext={() => goTo(3)}
              />
            ) : (
              <AccountsStep
                hasSteamLinked={hasSteamLinked}
                onBack={onBack}
                onFinish={finish}
                isFinishing={completeOnboarding.isPending}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Page shell reveal: progress bar, skip link, and the active step's content
// area fade/slide up one after another on first load instead of all
// popping in at once.
const pageVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Same stagger applied *inside* each step so its own title/inputs/buttons
// cascade in too — StepReveal uses display:contents so it doesn't add an
// extra flex box, letting its children sit directly in the step's own
// flex-col gap.
function StepReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="contents" variants={pageVariants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  // w-full matters here, not just cosmetically: without it this is an
  // auto-width flex item (parent uses items-center), so any w-full
  // button/input inside resolves against an undefined width and collapses
  // to its own shrink-to-fit size instead of actually filling the step.
  return (
    <motion.div variants={revealVariants} className="w-full">
      {children}
    </motion.div>
  );
}

// Shared action layout for every step: one full-width primary button, then
// an optional row of equal-width secondary buttons (back / skip) right
// below it — so every step's buttons line up identically and only the
// labels/variants change between steps.
function StepActions({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  onBack,
  backLabel,
  secondaryLabel,
  onSecondary,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onBack?: () => void;
  backLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <Button className="w-full" disabled={primaryDisabled} isLoading={primaryLoading} onClick={onPrimary}>
        {primaryLabel}
      </Button>
      {onBack || (secondaryLabel && onSecondary) ? (
        <div className="flex w-full gap-2">
          {onBack ? (
            <Button variant="secondary" className="flex-1" onClick={onBack}>
              {backLabel}
            </Button>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <Button variant="secondary" className="flex-1" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const t = useTranslations("Onboarding");

  return (
    <StepReveal>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      >
        <WelcomeIllustration className="text-accent" />
      </motion.div>
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("welcomeTitle")}</h1>
          <p className="text-muted-foreground">{t("welcomeSubtitle")}</p>
        </div>
      </Reveal>
      <Reveal>
        <StepActions primaryLabel={t("welcomeCta")} onPrimary={onNext} />
      </Reveal>
    </StepReveal>
  );
}

function ProfileStep({
  profile,
  onBack,
  onNext,
}: {
  profile: Profile;
  onBack?: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("Onboarding");
  const [username, setUsername] = useState(profile.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.image);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: onNext,
    onError: (err) => toast.error(err.data?.code === "CONFLICT" ? t("usernameTaken") : t("genericError")),
  });

  async function uploadAvatarFile(file: File) {
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const result = await uploadAvatar(formData);
      setAvatarUrl(result.url);
    } catch {
      toast.error(t("genericError"));
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <StepReveal>
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("profileTitle")}</h1>
          <p className="text-muted-foreground">{t("profileSubtitle")}</p>
        </div>
      </Reveal>

      <Reveal>
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatarFile(file);
            }}
          />
          <button
            type="button"
            aria-label={t("avatarButton")}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingAvatar(true);
            }}
            onDragLeave={() => setIsDraggingAvatar(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingAvatar(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadAvatarFile(file);
            }}
            className={cn(
              "relative mx-auto block size-20 shrink-0 overflow-hidden rounded-full border bg-muted transition-colors",
              isDraggingAvatar ? "border-accent" : "border-border hover:border-accent",
            )}
          >
            {avatarUrl ? <Image src={avatarUrl} alt="" fill unoptimized className="object-cover" /> : null}
            {avatarUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Spinner className="text-foreground" />
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex h-7 items-end justify-center bg-gradient-to-t from-black/70 to-transparent pb-1.5">
                <CameraIcon width={14} height={14} className="text-white" />
              </div>
            )}
          </button>
        </>
      </Reveal>

      <Reveal>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("usernamePlaceholder")}
          className="mx-auto h-10 w-full max-w-48 rounded-md border border-border bg-card px-3 text-center text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        />
      </Reveal>

      <Reveal>
        <StepActions
          primaryLabel={t("continue")}
          primaryDisabled={!username.trim()}
          primaryLoading={updateProfile.isPending}
          onPrimary={() =>
            updateProfile.mutate({
              name: profile.name?.trim() || username.trim(),
              username: username.trim(),
            })
          }
          onBack={onBack}
          backLabel={t("back")}
          secondaryLabel={t("skip")}
          onSecondary={onNext}
        />
      </Reveal>
    </StepReveal>
  );
}

const STARTER_GAMES_LIMIT = 12;
const MAX_STARTER_GAMES = 5;

function GamesStep({
  addedCount,
  setAddedCount,
  onBack,
  onNext,
}: {
  addedCount: number;
  setAddedCount: (updater: (count: number) => number) => void;
  onBack?: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("Onboarding");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const { data: popularGames } = trpc.game.popular.useQuery(undefined, { enabled: debouncedQuery.trim().length < 2 });
  const { data: searchResults } = trpc.game.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.trim().length >= 2 },
  );
  const games = (debouncedQuery.trim().length >= 2 ? searchResults : popularGames)?.slice(0, STARTER_GAMES_LIMIT);

  const addGame = trpc.log.upsert.useMutation({
    onError: () => toast.error(t("genericError")),
  });
  const removeGame = trpc.log.delete.useMutation({
    onError: () => toast.error(t("genericError")),
  });

  const atLimit = addedIds.size >= MAX_STARTER_GAMES;

  return (
    <StepReveal>
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("gamesTitle")}</h1>
          <p className="text-muted-foreground">{t("gamesSubtitle")}</p>
        </div>
      </Reveal>

      <Reveal>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("gamesSearchPlaceholder")}
          className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent"
        />
      </Reveal>

      <Reveal>
        <div className="grid w-full grid-cols-3 gap-4 sm:grid-cols-4">
          {games?.map((game) => {
            const added = addedIds.has(game.id);
            return (
              <button
                key={game.id}
                type="button"
                disabled={!added && atLimit}
                onClick={() => {
                  if (added) {
                    removeGame.mutate({ gameId: game.id });
                    setAddedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(game.id);
                      return next;
                    });
                    setAddedCount((count) => count - 1);
                  } else {
                    addGame.mutate({ gameId: game.id, status: "BACKLOG" });
                    setAddedIds((prev) => new Set(prev).add(game.id));
                    setAddedCount((count) => count + 1);
                  }
                }}
                className="group flex flex-col gap-1.5 disabled:pointer-events-none disabled:opacity-40"
              >
                <div
                  className={cn(
                    "relative aspect-[3/4] w-full overflow-hidden rounded-md border bg-muted transition-opacity",
                    added ? "border-accent" : "border-border group-hover:opacity-80",
                  )}
                >
                  {game.coverUrl ? (
                    <Image src={game.coverUrl} alt={game.title} fill unoptimized className="object-cover" />
                  ) : null}
                  {added ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-lg font-bold text-accent">
                      ✓
                    </div>
                  ) : null}
                </div>
                <span className="truncate text-xs text-muted-foreground">{game.title}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal>
        <p className="text-sm text-muted-foreground">
          {t("gamesAddedCount", { count: addedCount, max: MAX_STARTER_GAMES })}
        </p>
      </Reveal>
      <Reveal>
        <StepActions
          primaryLabel={t("continue")}
          onPrimary={onNext}
          onBack={onBack}
          backLabel={t("back")}
          secondaryLabel={t("skip")}
          onSecondary={onNext}
        />
      </Reveal>
    </StepReveal>
  );
}

function AccountsStep({
  hasSteamLinked,
  onBack,
  onFinish,
  isFinishing,
}: {
  hasSteamLinked: boolean;
  onBack?: () => void;
  onFinish: () => void;
  isFinishing: boolean;
}) {
  const t = useTranslations("Onboarding");

  // hasSteamLinked only turns true via a full page navigation (the Steam
  // OAuth redirect back to /onboarding), so this component only ever mounts
  // once per link — a mount-time toast is enough, no transition to watch for.
  useEffect(() => {
    if (hasSteamLinked) toast.success(t("steamLinked"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepReveal>
      <Reveal>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("accountsTitle")}</h1>
          <p className="text-muted-foreground">{t("accountsSubtitle")}</p>
        </div>
      </Reveal>

      {/* Everything below sits in one gap-2 group (same tight rhythm as
          StepActions elsewhere) instead of inheriting the step's own
          gap-8 — the Steam CTA and the buttons under it read as one unit. */}
      <Reveal>
        <div className="flex w-full flex-col gap-2">
          {hasSteamLinked ? (
            <SteamSyncButton className="w-full" />
          ) : (
            // SteamLinkButton's own <a> defaults to inline, which shrinks to
            // its text instead of matching every other step's full-width
            // button — block+w-full here makes it line up like the rest.
            <SteamLinkButton
              href="/api/auth/steam/login?redirectTo=/onboarding"
              label={t("linkSteam")}
              className="block w-full"
            />
          )}

          {hasSteamLinked ? (
            <Button variant="primary" className="w-full" onClick={onFinish} isLoading={isFinishing}>
              {t("finish")}
            </Button>
          ) : null}

          {onBack && hasSteamLinked ? (
            <Button variant="secondary" className="w-full" onClick={onBack}>
              {t("back")}
            </Button>
          ) : onBack || !hasSteamLinked ? (
            <div className="flex w-full gap-2">
              {onBack ? (
                <Button variant="secondary" className="flex-1" onClick={onBack}>
                  {t("back")}
                </Button>
              ) : null}
              {!hasSteamLinked ? (
                <Button variant="secondary" className="flex-1" onClick={onFinish} isLoading={isFinishing}>
                  {t("skip")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Reveal>
    </StepReveal>
  );
}
