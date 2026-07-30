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
import { getLatestVersion } from "@/lib/github-releases";
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-20 sm:pb-0">
        <NextIntlClientProvider messages={messages}>
          <TRPCProvider>
            <TopNav
              isLoggedIn={Boolean(session?.user)}
              username={session?.user?.username ?? null}
              userImage={session?.user?.image ?? null}
              version={version}
            />
            <Header />
            {children}
            <Footer />
            <InstallPrompt />
          </TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
