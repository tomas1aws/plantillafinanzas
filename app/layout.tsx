import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Plantilla Finanzas", description: "Finanzas personales y compartidas con Supabase" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
