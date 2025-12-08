import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./_components/AuthProvider";
import { TrainerNotificationsProvider } from "./_components/TrainerNotificationsProvider";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymRatIA",
  description: "Entrenadores-agente personalizados, planes adaptativos y análisis de progreso",
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
