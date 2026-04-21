import { ExampleVerificationEmbed } from "@/components/examples/ExampleVerificationEmbed";
import { IndexedGuideShell } from "@/components/guides/IndexedGuideShell";
import type { ParsedSurfaceFile } from "@/lib/surfaceMarkdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SurfaceProgression } from "./SurfaceProgression";

type Props = {
  surface: ParsedSurfaceFile;
};

export function DiscoverySurfacePage({ surface }: Props) {
  const progression = <SurfaceProgression primaryCta={surface.primaryCta} />;
  const article = (
    <article className="integrate-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{surface.body}</ReactMarkdown>
    </article>
  );
  if (surface.surfaceKind === "comparison") {
    return (
      <main className="integrate-main">
        {article}
        {progression}
      </main>
    );
  }
  if (surface.surfaceKind === "example") {
    return (
      <main className="integrate-main">
        {article}
        <ExampleVerificationEmbed variant={surface.embedKey!} />
        {progression}
      </main>
    );
  }
  return <IndexedGuideShell progressionStrip={progression}>{article}</IndexedGuideShell>;
}
