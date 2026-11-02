import type { Metadata } from "next";
import { FaqList, FinalCta, PageHero } from "@/components/Sections";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <main>
      <PageHero title="Questions?" sub="Setup, keys, safety and how to check the results." />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <FaqList />
        </div>
      </section>
      <FinalCta />
    </main>
  );
}
