import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-head">
      <Link href="/login" className="site-brand">
        <span className="site-mark">FCL</span>
        CAFS Study Studio
      </Link>
      <nav className="site-nav" aria-label="Account">
        <Link href="/login" className="site-signin">
          Sign in
        </Link>
        <Link href="/register" className="site-register">
          Registration
        </Link>
      </nav>
    </header>
  );
}
