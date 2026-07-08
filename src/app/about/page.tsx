import { PageTransition, FloatingBackButton } from "@/components";
import { HighlightableContent } from "@/components/HighlightableContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Fred Zaw",
};

export default function AboutPage() {
  return (
    <PageTransition>
      <FloatingBackButton />
      <HighlightableContent>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-24">
          <header className="mb-10 mt-14">
            <h1 className="text-3xl font-medium mb-1 font-serif leading-tight">About Me</h1>
          </header>

          <section className="mb-24 space-y-4 text-base long-form">
            <p>
              I&apos;m a designer and creative technologist that&apos;s been in the game for
              over a decade. I owe my career to the Bay Area where I was born,
              raised, and gained interest in technology by proximity and
              osmosis.
            </p>
            <p>
              In my youth, my household had a tight budget, but that constraint
              helped me get creative in my hobbies. I built low-end gaming rigs,
              learned how to overclock CPUs, and scoured the internet for pirated
              and cracked software and games. In high school, I didn&apos;t know
              what I wanted to be, but I knew I enjoyed myself most in physics
              class when I was building catapults or propeller-powered cars. This
              led me to study industrial design.
            </p>
            <p>
              While in university, I was fortunate to intern at <a href="https://quirky.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground">Quirky Inc.</a> where
              I helped design products sold at retailers like Target and Bed Bath
              and Beyond. While I continue to love ID, I became more interested
              in what I saw a more as a more multidisciplinary and faster process
              of building in software. I dropped out of school to self-teach and
              pursue UI design.
            </p>
            <p>
              Throughout my life, curiosity has led me. Whether it was in the
              first part of my career, working at early-stage startups like Getable or <a href="https://techcrunch.com/2015/06/17/sean-parker-brigade/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground"> Brigade</a> learning about new fields and building a breadth
              of experience being scrappy, getting technical or strategic
              whenever needed. Or outside of work when I began learning p5.js,
              Blender, Arduino, and After Effects to create generative artwork,
              eventually spending time at <a href="https://grayarea.org/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground">Gray Area Center for the Arts</a> in the
              Mission. Or when I was eventually brought to spatial computing,
              computer vision, and AI at Ebay, <a href="https://coolhunting.com/tech/make-3d-digital-clones-matterport-capture/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground">Matterport</a>, and <a href="https://effecthouse.tiktok.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground">TikTok</a>.
            </p>
            <p>
              When I wanted to explore new technologies, I thought about my
              interest in crypto when I first learned about Bitcoin, making my
              first purchase of BTC on Coinbase in 2013 because I resonated with
              the idea of programmable money. This brought me to Uniswap where
              I&apos;ve been working on trading, liquidity provision, and market
              insights interfaces.
            </p>
            <p>
              At Uniswap, I began exploring LLMs and not just how they might
              influence interfaces for traders but also in how we can, in a
              scalable manner, leverage them to further blur the lines between
              Design and Engineering in order to bring even higher quality
              interfaces to users.
            </p>
            <p>
              Most recently, I&apos;ve joined <a href="https://clay.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground">Clay</a> where I work on AI and
              agentic capabilities as well as internal tools, continuing to
              chase that intersection of design, engineering, and applied AI.
            </p>
            <p>
              Outside of work these days, I&apos;m an apprentice winemaker, merging my
              loves for craft and nature.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-medium font-serif mb-10 leading-snug">Work Experience</h2>

            <div className="space-y-10 text-sm leading-relaxed">
              {/* Clay */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2026 — Now</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Clay</p>
                  <p className="text-muted-foreground">Working on AI and agentic capabilities as well as internal tools.</p>
                </div>
              </div>

              {/* Uniswap Labs */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2022 — 2026</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Uniswap Labs</p>
                  <p className="text-muted-foreground">Leading design on web, swapping/trading, market data, and liquidity provision.</p>
                </div>
              </div>
              
              {/* Yours Truly */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2016 — Now</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Yours Truly</p>
                  <p className="text-muted-foreground">My private design practice at which I&apos;ve worked on a variety of projects involving non-profit, civic engagement, and spatial computing.</p>
                </div>
              </div>

              {/* TikTok */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2021 — 2021</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">TikTok</p>
                  <p className="text-muted-foreground">Founding designer on Effect House, TikTok&apos;s first creative tool for authoring AR experiences. Enabled millions of effects to power viral trends across TikTok.</p>
                </div>
              </div>

              {/* Matterport */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2019 — 2021</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Matterport</p>
                  <p className="text-muted-foreground">Led design for Matterport for Mobile, the first app to turn smartphones into 3D capture devices. Defined product vision, capture workflows, and real-time spatial feedback systems to make 3D scanning accessible without specialized hardware, driving new user adoption across iOS and Android.</p>
                </div>
              </div>

              {/* Ebay */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2017 — 2018</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Ebay</p>
                  <p className="text-muted-foreground">Founding designer on multiple 0→1 initiatives exploring the future of AI, AR, and conversational commerce.</p>
                </div>
              </div>
              
              {/* Getable */}
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2013 — 2015</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">Getable</p>
                  <p className="text-muted-foreground">Founding designer on cross-platform solutions for construction technology: equipment management and ordering systems.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-2xl font-medium font-serif mb-10 leading-snug">Volunteering</h2>
            <div className="space-y-10 text-sm leading-relaxed">
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2022 — Now</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">
                      Design Committee at OAK Currency
                  </p>
                  <p className="text-muted-foreground">Oakland, CA</p>
                  <p className="text-muted-foreground mt-1">We are working on a stable currency that will aid in establishing a regenerative economy here in Oakland - community-governed lending initiatives, funding for public services/goods, and a commerce network that directly supports local businesses.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-2xl font-medium font-serif mb-10 leading-snug">Education</h2>
            <div className="space-y-10 text-sm leading-relaxed">
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2017 — 2017</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">
                      Creative Technology Immersive Program at Gray Area Foundation for the Arts
                  </p>
                  <p className="text-muted-foreground">San Francisco, CA</p>
                </div>
              </div>
              <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
                <p className="text-muted-foreground">2008 — 2012</p>
                <div className="space-y-1 pt-0.25">
                  <p className="font-medium">BS Industrial Design at SJSU <span className="text-xs text-muted-foreground ml-1">(Incomplete)</span></p>
                  <p className="text-muted-foreground">Chairperson of the Industrial Designers Society of America (IDSA) at SJSU.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </HighlightableContent>
    </PageTransition>
  );
} 