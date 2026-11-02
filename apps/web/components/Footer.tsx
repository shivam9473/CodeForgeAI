import Link from "next/link";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Pipeline", href: "/pipeline" },
      { label: "Agents", href: "/agents" },
      { label: "Sandbox", href: "/sandbox" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/shivam9473/CodeForgeAI" },
      { label: "README", href: "https://github.com/shivam9473/CodeForgeAI#readme" },
      { label: "Eval dataset", href: "https://github.com/shivam9473/CodeForgeAI/blob/main/evals/datasets/bugs.json" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mute">
            CodeForge imports a codebase, hunts for bugs, verifies them, and writes the tests and docs. You review the result on a live dashboard.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-mute">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("http") ? (
                    <a href={link.href} className="transition-colors hover:text-paper">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="transition-colors hover:text-paper">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-6 py-5 text-center text-xs text-mute">© 2026 CodeForge AI. Built by Shivam.</div>
    </footer>
  );
}
