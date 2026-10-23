import type { Metadata } from "next";
import "./globals.css";
import { ThemeInitializer } from "./theme-initializer";

export const metadata: Metadata = {
  title: "Gestión MD",
  description: "Espacio de gestión de proyectos, actividades y documentos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body><ThemeInitializer />{children}</body>
    </html>
  );
}
