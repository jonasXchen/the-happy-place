"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Truck,
  Leaf,
  Armchair,
  Gift,
} from "lucide-react";
import { useStore } from "@/components/store";
import { ProductCard, SectionHeading } from "@/components/products";
import { isPublished } from "@/lib/commerce";
export default function Home() {
  const s = useStore();
  const products = s.products.filter((p) => p.active);
  const collections = s.collections.filter((c) => isPublished(c));
  return (
    <>
      <section className="hero">
        <Image
          className="hero-image"
          src={s.settings.hero_image}
          alt="A warm, considered living room with sculptural furniture"
          fill
          sizes="100vw"
          preload
          unoptimized={
            !s.settings.hero_image.startsWith("/images/") &&
            !s.settings.hero_image.startsWith(
              process.env.NEXT_PUBLIC_SUPABASE_URL
                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thp-images/`
                : "https://d1xz210606bzef.cloudfront.net/",
            )
          }
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">GOOD THINGS BEGIN AT HOME</span>
          <h1 className="preline">{s.settings.hero_title}</h1>
          <p className="preline">{s.settings.hero_subtitle}</p>
          <Link href="/shop" className="button cream">
            Find your happy place <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="hero-bottom">
          <span>A LITTLE LESS ORDINARY. A LITTLE MORE YOU.</span>
          <Link href="/collections">
            Explore our world <ArrowDownIcon />
          </Link>
        </div>
        <span className="hero-pagination">
          <i />A PLACE TO BE
        </span>
      </section>
      <div className="promise-bar">
        <span>
          <Armchair size={17} /> Pieces with personality
        </span>
        <span>
          <Leaf size={17} /> Considered materials
        </span>
        <span>
          <Truck size={17} /> Delivered to your doorstep
        </span>
        <Link href="/rewards">
          <Gift size={17} /> A little more rewarding
        </Link>
      </div>
      <section className="section categories">
        <SectionHeading
          eyebrow="MAKE YOURSELF AT HOME"
          title="A piece for every corner."
          href="/shop"
        />
        <div className="category-list">
          {[
            ["Sofas & lounge", "sofas", "sofa"],
            ["Tables", "tables", "table"],
            ["Chairs", "chairs", "chair"],
            ["Storage", "storage", "sideboard"],
            ["Home objects", "decor", "tray"],
          ].map(([name, category, image], i) => (
            <Link key={name} href={`/shop?category=${category}`}>
              <div>
                <img src={`/images/${image}.jpg`} alt={name} loading="lazy" />
              </div>
              <span>
                {name}
                <ArrowUpRight size={16} />
              </span>
              <small>0{i + 1}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="section favourites">
        <SectionHeading
          eyebrow="THE ONES WE KEEP COMING BACK TO"
          title="Meet your new favourites."
          href="/shop"
        />
        <div className="product-grid">
          {products
            .filter((p) => p.featured)
            .slice(0, 4)
            .map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
        </div>
      </section>
      <section className="editorial">
        <div className="editorial-image">
          <img
            src={collections[0]?.image || "/images/interior.jpg"}
            alt="Natural materials and soft shapes in a welcoming home"
            loading="lazy"
          />
          <span>SPACES TO SLOW DOWN IN</span>
        </div>
        <div className="editorial-copy">
          <span className="eyebrow">LESS RUSH. MORE ROOM.</span>
          <h2>
            Good design.
            <br />A softer everyday.
          </h2>
          <p>
            A favourite chair. A table you gather around. The little things that
            turn a house into your kind of home.
          </p>
          <p>
            We bring together pieces with character, chosen to live with you,
            beautifully.
          </p>
          <Link href="/collections/slow-living" className="text-button">
            Discover slow living <ArrowUpRight size={17} />
          </Link>
          <span className="editorial-number">01 / THE CONSIDERED HOME</span>
        </div>
      </section>
      <section className="section">
        <SectionHeading
          eyebrow="GOOD THINGS, WITHOUT THE WAIT"
          title="Ready when you are."
          href="/shop?availability=ready"
          link="Shop ready to ship"
        />
        <div className="product-grid ready-grid">
          {products
            .filter((p) => p.variants.some((v) => v.lead_weeks === 0))
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="reward-banner">
        <div className="reward-art">
          h<span>p</span>
          <i>+</i>
        </div>
        <div>
          <span className="eyebrow">HAPPY HOMES. HAPPY REWARDS.</span>
          <h2>
            A little thank you,
            <br />
            every time you shop.
          </h2>
          <p>Earn points. Discover rewards. Make yourself at home.</p>
          <Link href="/rewards" className="button outline">
            Meet happy rewards <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section showroom">
        <div>
          <span className="eyebrow">LET&apos;S FIND YOUR HAPPY PLACE</span>
          <h2>
            Some things are
            <br />
            better in person.
          </h2>
          <p>
            Feel the fabrics. See the finishes. Take your time.
            <br />
            Visit our showroom and make yourself comfortable.
          </p>
          <Link href="/contact" className="text-button">
            Come say hello <ArrowUpRight size={17} />
          </Link>
        </div>
        <img
          src="/images/interior.jpg"
          alt="The Happy Place furniture and interior details"
          loading="lazy"
        />
      </section>
    </>
  );
}
function ArrowDownIcon() {
  return <span aria-hidden="true">↓</span>;
}
