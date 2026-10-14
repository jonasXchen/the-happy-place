"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h3>Let&apos;s try that again.</h3>
      <p>
        We couldn&apos;t load this part of the store. Please refresh or contact
        our team if it continues.
      </p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
