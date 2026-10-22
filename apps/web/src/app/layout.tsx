import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Resolution | InDebted",
  description:
    "A simulated two-way SMS assistant, secure task interfaces and an evidence-based financial model for consumer-led resolution.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
