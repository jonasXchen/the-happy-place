"use client";
import { useState } from "react";
export function Unsubscribe({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="empty-state">
      <h3>{done ? "You're off the list." : "A little less in your inbox?"}</h3>
      <p>
        {done
          ? "Promotional emails will stop. Order and delivery updates will still reach you."
          : `Unsubscribe ${email} from news and promotional emails.`}
      </p>
      {!done && (
        <button
          className="button dark"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const response = await fetch("/api/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setDone(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Unsubscribe
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
