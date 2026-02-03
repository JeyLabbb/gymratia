import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./_components/AuthProvider";
import { TrainerNotificationsProvider } from "./_components/TrainerNotificationsProvider";
import { TermsGuard } from "./_components/TermsGuard";
import { getBaseUrl, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo";

const bebasNeue = localFont({
  src: "../../node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2",
  variable: "--font-bebas",
  display: "swap",
  weight: "400",
});

const inter = localFont({
  src: [
    { path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "entrenador personal",
    "entrenador IA",
    "plan de entrenamiento",
    "dieta personalizada",
    "fitness",
    "gym",
    "seguimiento progreso",
    "entrenamiento adaptativo",
  ],
  authors: [{ name: SITE_NAME, url: baseUrl }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: baseUrl,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/apple-touch-icon.png",
        width: 180,
        height: 180,
        alt: "GymRatIA - Entrenador IA personalizado",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/apple-touch-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: {
    canonical: baseUrl,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: baseUrl,
  logo: `${baseUrl}/apple-touch-icon.png`,
  description: DEFAULT_DESCRIPTION,
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@gymratia.com",
    contactType: "customer service",
  },
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: baseUrl,
  description: DEFAULT_DESCRIPTION,
  publisher: { "@id": `${baseUrl}/#organization` },
  inLanguage: "es-ES",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${bebasNeue.variable} ${inter.variable} font-body antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdOrganization),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdWebSite),
          }}
        />
        <AuthProvider>
          <TermsGuard>
            <TrainerNotificationsProvider>
              {children}
            </TrainerNotificationsProvider>
          </TermsGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
