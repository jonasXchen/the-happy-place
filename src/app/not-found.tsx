import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h3>A little off the beaten path.</h3>
      <p>We couldn&apos;t find that page.</p>
      <Link href="/shop" className="button dark">
        Find your happy place
      </Link>
    </div>
  );
}
