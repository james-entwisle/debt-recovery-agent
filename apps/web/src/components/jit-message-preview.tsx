"use client";

import Image from "next/image";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import type { JitState } from "@/lib/api";
import { jitPreviewFor } from "@/lib/jit-preview";
import "./jit-message-preview.css";

export function JitMessagePreview({ state, onOpen, disabled = false }: {
  state: JitState;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const preview = jitPreviewFor(state);

  return (
    <button className="jit-preview" type="button" onClick={onOpen} disabled={disabled} aria-label={`Open secure task: ${preview.title}`}>
      <Image className="jit-preview-image" src={preview.image} width={1200} height={630} alt="" unoptimized />
      <span className="jit-preview-copy">
        <span className="jit-preview-label"><LockKeyhole size={10} aria-hidden="true" /> Secure account</span>
        <span className="jit-preview-title">{preview.title}<ArrowUpRight size={15} aria-hidden="true" /></span>
        <span className="jit-preview-description">{preview.description}</span>
        <span className="jit-preview-demo">Local demo · secure task</span>
      </span>
    </button>
  );
}
