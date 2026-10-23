import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión del trabajo",
  description: "Espacio de gestión de proyectos, actividades y documentos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
