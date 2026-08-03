import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download, FileText, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/adabah-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ADABAH — Turn any PDF into a full audiobook" },
      {
        name: "description",
        content:
          "ADABAH narrates PDFs of any length into complete audiobooks. Stream them on site or download the MP3.",
      },
      { property: "og:title", content: "ADABAH — PDF to audiobook AI" },
      {
        property: "og:description",
        content: "Attach a PDF, get a full narrated audiobook you can stream or download.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileText,
    title: "Any page count",
    body: "Two pages or two hundred — ADABAH reads every page and narrates it in order.",
  },
  {
    icon: Headphones,
    title: "Listen right here",
    body: "A player appears in the chat the moment narration finishes.",
  },
  {
    icon: Download,
    title: "Keep the MP3",
    body: "Download one continuous file for your phone, car or podcast app.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2">
          <img alt="ADABAH" className="size-8" height={512} src={logo} width={512} />
          <span className="font-display text-lg font-semibold tracking-tight">ADABAH</span>
        </span>
        <Button asChild size="sm" variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 pt-14 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          AI narrator · PDF to audiobook
        </p>
        <h1 className="mt-5 text-5xl font-bold leading-[1.05] sm:text-6xl">
          Every PDF you own,{" "}
          <span className="text-gradient-warm">read aloud in full</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          Drop in a document and ADABAH turns it into a complete audiobook — streamable in the chat
          and downloadable as a single MP3.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/c">
              Start narrating <ArrowRight className="ml-2 size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto mt-20 grid w-full max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]"
            key={feature.title}
          >
            <feature.icon className="size-5 text-accent" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
