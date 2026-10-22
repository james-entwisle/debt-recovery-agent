import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { jitPreviewForKind, jitPreviewKinds } from "@/lib/jit-preview";
import "@/components/jit-message-preview.css";

type Props = { params: Promise<{ kind: string }> };

export function generateStaticParams() {
  return jitPreviewKinds.map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const preview = jitPreviewForKind((await params).kind);
  if (!preview) notFound();
  return {
    metadataBase: new URL("http://localhost:3000"),
    title: `${preview.title} | Debt Recovery Agent demo`,
    description: preview.description,
    referrer: "no-referrer",
    robots: { index: false, follow: false },
    alternates: { canonical: preview.path },
    openGraph: {
      title: preview.title,
      description: preview.description,
      siteName: "Debt Recovery Agent demo",
      type: "website",
      url: preview.path,
      images: [{ url: preview.image, width: 1200, height: 630, alt: preview.title }],
    },
  };
}

export default async function JitPreviewPage({ params }: Props) {
  const preview = jitPreviewForKind((await params).kind);
  if (!preview) notFound();
  return (
    <main className="jit-preview-public">
      <Image src={preview.image} width={1200} height={630} alt="" unoptimized />
      <span className="jit-preview-label">Debt Recovery Agent · local demonstration</span>
      <h1>{preview.title}</h1>
      <p>{preview.description}</p>
      <p>This is a generic task preview. Open the task from the SMS Simulator to continue in your demo session.</p>
      <Link href="/">Open SMS Simulator</Link>
    </main>
  );
}
