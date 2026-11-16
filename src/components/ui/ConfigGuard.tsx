"use client";
import type { ReactNode } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";

export function ConfigGuard({ children }: { children: ReactNode }) {
  if (isFirebaseConfigured) return <>{children}</>;
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="font-serif text-3xl font-bold">Firebase belum dikonfigurasi</h1>
      <p className="text-pine-700">
        Salin <code className="rounded bg-cream-200 px-1.5 py-0.5">.env.example</code> menjadi{" "}
        <code className="rounded bg-cream-200 px-1.5 py-0.5">.env.local</code>, isi kunci web app Firebase, lalu restart{" "}
        <code className="rounded bg-cream-200 px-1.5 py-0.5">npm run dev</code>.
      </p>
    </div>
  );
}
