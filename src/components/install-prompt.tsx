"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "quested-install-prompt-answered";

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

function hasAnsweredCookie() {
  return document.cookie.split("; ").some((row) => row.startsWith(`${COOKIE_NAME}=`));
}

function setAnsweredCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; max-age=${oneYear}; path=/`;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function InstallPrompt() {
  const t = useTranslations("InstallPrompt");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || hasAnsweredCookie()) return;

    if (isIos()) {
      // No beforeinstallprompt event on iOS to react to — defer to a real
      // timer callback instead of setting state synchronously in the effect.
      const id = setTimeout(() => {
        setIos(true);
        setVisible(true);
      }, 0);
      return () => clearTimeout(id);
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setAnsweredCookie();
    setVisible(false);
  }

  async function install() {
    setAnsweredCookie();
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-card px-4 py-3 shadow-sm sm:hidden">
      <div className="flex items-center gap-3">
        <Logo width={32} height={32} className="shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">{t("title")}</p>
          <p className="text-muted-foreground">{ios ? t("iosDescription") : t("description")}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {ios ? (
          <Button onClick={dismiss}>{t("gotIt")}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={dismiss}>
              {t("dismiss")}
            </Button>
            <Button onClick={install}>{t("install")}</Button>
          </>
        )}
      </div>
    </div>
  );
}
