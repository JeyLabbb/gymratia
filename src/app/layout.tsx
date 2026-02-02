import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "./_components/AuthProvider";
import { TrainerNotificationsProvider } from "./_components/TrainerNotificationsProvider";

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

export const metadata: Metadata = {
  title: "GymRatIA",
  description: "Entrenadores-agente personalizados, planes adaptativos y análisis de progreso",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        <AuthProvider>
          <TrainerNotificationsProvider>
            {children}
          </TrainerNotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
