import Link from "next/link";
import { ArrowUpRight, Database, CheckCircle2 } from "lucide-react";
import { Logo } from "./shell";
import { RefreshStore } from "./refresh-store";
export function StoreSetup() {
  return (
    <>
      <header className="header">
        <Logo />
        <span className="eyebrow">STORE SETUP</span>
      </header>
      <main className="content-page">
        <span className="eyebrow">THE HAPPY PLACE, TAKING SHAPE</span>
        <h1>Let&apos;s bring your store home.</h1>
        <div className="notice">
          <CheckCircle2
            size={16}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: 8,
            }}
          />
          Your Supabase connection is configured. The store tables and initial
          settings still need to be installed.
        </div>
        <h2>A home for your catalogue.</h2>
        <p>
          Open the SQL Editor in your configured Supabase project. Run the setup
          file to create the store tables, permissions, and initial catalogue.
          The store uses thehappyplace_ tables and can share a project with
          Grainbuds.
        </p>
        <div className="inline-actions" style={{ marginTop: 25 }}>
          <a
            className="button dark"
            href="/api/setup/schema"
            download="happy-place-setup.sql"
          >
            Download store setup SQL <Database size={16} />
          </a>
          <a
            className="button outline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Open Supabase <ArrowUpRight size={16} />
          </a>
        </div>
        <p className="small-text muted" style={{ marginTop: 25 }}>
          The setup file creates The Happy Place tables alongside existing
          tables. It refuses to run over an existing Happy Place store. If you
          already installed the migrations, load the initial settings with the
          seed command in README.md.
        </p>
        <h2>Then make it your own.</h2>
        <p>
          The initial catalogue remains in draft until the owner verifies the
          finishes, prices, stock, and delivery terms. Staff access starts with
          an owner assignment in Supabase. Stripe and email can be connected
          after the catalogue is reviewed.
        </p>
        <div className="divider" />
        <RefreshStore>I&apos;ve run the setup. Refresh the store.</RefreshStore>
      </main>
    </>
  );
}
export function OwnerBootstrap({ id, email }: { id: string; email: string }) {
  const safeEmail = email.replaceAll("'", "''");
  const sql = `insert into public.thehappyplace_staff(user_id, email, roles)\nvalues ('${id}', '${safeEmail}', array['owner']);`;
  return (
    <div className="content-page">
      <span className="eyebrow">ONE LAST OWNER SETUP STEP</span>
      <h1>Your store. Your controls.</h1>
      <p>
        You are signed in as {email}. The store has no owner assigned yet. If
        this is the owner&apos;s account, run the following statement in the
        Supabase SQL Editor. This website cannot grant itself owner access.
      </p>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "var(--cream)",
          padding: 25,
          lineHeight: 1.7,
          fontSize: "1rem",
          margin: "25px 0",
        }}
      >
        {sql}
      </pre>
      <RefreshStore dark>
        I&apos;ve assigned the owner. Open admin.
      </RefreshStore>
      <Link href="/" className="text-button" style={{ marginLeft: 20 }}>
        View the store
      </Link>
    </div>
  );
}
