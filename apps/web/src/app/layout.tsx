import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InDebted case study",
  description: "Product lead interview case study workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
