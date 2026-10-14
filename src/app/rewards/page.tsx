"use client";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { useStore } from "@/components/store";
import { isPublished } from "@/lib/commerce";
import { money } from "@/lib/types";
export default function Rewards() {
  const s = useStore();
  return (
    <>
      <section className="reward-page-hero">
        <span className="eyebrow">WELCOME TO HAPPY REWARDS</span>
        <h1>
          Good things come
          <br />
          back around.
        </h1>
        <p>
          Make your home a little happier, and we&apos;ll say thank you. Earn
          points when you shop and turn them into something to look forward to.
        </p>
        <Link href="/account" className="button dark" style={{ marginTop: 25 }}>
          Make yourself at home <ArrowRight size={16} />
        </Link>
      </section>
      <section className="section">
        <div className="steps">
          <div>
            <span>01</span>
            <h3>Join the family.</h3>
            <p>
              Create a free account.{" "}
              {s.settings.signup_points > 0 &&
                `Start with ${s.settings.signup_points} welcome points.`}
            </p>
          </div>
          <div>
            <span>02</span>
            <h3>Find your favourites.</h3>
            <p>
              Earn {s.settings.points_per_dollar} point
              {s.settings.points_per_dollar === 1 ? "" : "s"} per eligible
              dollar after{" "}
              {s.settings.award_on === "paid"
                ? "confirmed payment"
                : "delivery"}
              . Delivery charges do not earn points.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Enjoy a little extra.</h3>
            <p>
              Choose a reward at checkout. Your points are valid for{" "}
              {s.settings.expiry_days} days from the date you earn them.
            </p>
          </div>
        </div>
        {s.demo && (
          <div className="notice">
            This is a preview of a configurable rewards programme. The owner
            must review the earning rate and reward terms before launch.
          </div>
        )}
        <div className="section-heading">
          <div>
            <span className="eyebrow">A THANK YOU, YOUR WAY</span>
            <h2>Little rewards. Happy moments.</h2>
          </div>
          <Gift size={24} strokeWidth={1} />
        </div>
        <div className="reward-cards">
          {s.rewards
            .filter((r) => isPublished(r))
            .map((r) => (
              <article className="reward-card" key={r.id}>
                <img
                  src={r.image || "/images/tray.jpg"}
                  alt="A considered piece for your home"
                />
                <span className="eyebrow">
                  {r.points.toLocaleString()} POINTS
                </span>
                <h3>{r.title}</h3>
                <p>
                  {r.description}
                  <br />
                  <small>
                    Minimum spend {money(r.min_spend_cents)}.{" "}
                    {r.limit_per_customer > 0
                      ? `Up to ${r.limit_per_customer} redemptions per member.`
                      : ""}{" "}
                    Rewards and discount codes cannot be combined.
                  </small>
                </p>
                <Link
                  className="button outline small"
                  href={s.cart.length ? `/checkout?reward=${r.id}` : "/shop"}
                >
                  Choose your next piece <ArrowRight size={15} />
                </Link>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
