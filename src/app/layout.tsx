import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión MD",
  description: "Espacio de gestión de proyectos, actividades y documentos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
