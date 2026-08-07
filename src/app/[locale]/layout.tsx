import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/provider";
import { auth } from "@/auth";
import { Header } from "@/components/header";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { InstallPrompt } from "@/components/install-prompt";
import { Toaster } from "sonner";
import { getLatestVersion } from "@/lib/github-releases";
import { pageAlternates } from "@/lib/alternates";
import { siteUrl, siteName } from "@/lib/site";
import { routing } from "@/i18n/routing";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#101012",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const description = t("description");

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description,
    alternates: pageAlternates(locale, ""),
    manifest: "/manifest.webmanifest",
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: siteName,
    },
    openGraph: {
      type: "website",
      siteName,
      title: siteName,
      description,
      url: siteUrl,
    },
    twitter: {
      card: "summary",
      title: siteName,
      description,
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  const [messages, session, version] = await Promise.all([getMessages(), auth(), getLatestVersion()]);
  // The proxy redirects any logged-in, not-yet-onboarded user to /onboarding
  // before they ever reach another page — so hiding chrome here whenever
  // onboarding is incomplete is equivalent to hiding it just on that route,
  // without needing to know the current pathname.
  const isOnboarding = Boolean(session?.user) && !session?.user.onboardedAt;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-20 sm:pb-0">
        <NextIntlClientProvider messages={messages}>
          <TRPCProvider>
            {isOnboarding ? null : (
              <>
                <TopNav
                  isLoggedIn={Boolean(session?.user)}
                  username={session?.user?.username ?? null}
                  userImage={session?.user?.image ?? null}
                  version={version}
                />
                <Header />
              </>
            )}
            <main className="flex flex-1 flex-col">{children}</main>
            {isOnboarding ? null : (
              <>
                <Footer />
                <InstallPrompt />
              </>
            )}
            <Toaster
              theme="dark"
              position="bottom-right"
              style={
                {
                  "--normal-bg": "var(--card)",
                  "--normal-text": "var(--foreground)",
                  "--normal-border": "var(--border)",
                  "--width": "26rem",
                } as React.CSSProperties
              }
            />
          </TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
