import { PageTransition, FloatingBackButton } from "@/components";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Fred Zaw",
};

export default function AboutPage() {
  return (
    <PageTransition>
      <FloatingBackButton />
      <div className="max-w-xl mx-auto px-6 py-24">
        <header className="mb-10 mt-14">
          <h1 className="text-3xl font-medium mb-1 font-serif">About Me</h1>
        </header>

        <section className="mb-24 space-y-4 text-base">
          <p>
            I&apos;m Fred Zaw, a designer at Uniswap Labs, where I&apos;m helping to unlock a more free and open financial system. Before diving into the world of crypto, I gained experience across a breadth of industries including AI and spatial computing.
          </p>
          <p>
            I thrive on solving complex problems and creating intuitive, beautiful, and impactful products. My approach is rooted in a deep understanding of user needs, combined with a passion for pushing the boundaries of design and technology.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium font-serif mb-10">Work Experience</h2>

          <div className="space-y-10 text-sm">
            {/* Uniswap Labs */}
            <div className="grid md:grid-cols-[110px_1fr] gap-x-6 gap-y-2">
              <p className="text-muted-foreground">2022 — Now</p>
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
          <h2 className="text-2xl font-medium font-serif mb-10">Volunteering</h2>
          <div className="space-y-10 text-sm">
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
          <h2 className="text-2xl font-medium font-serif mb-10">Education</h2>
          <div className="space-y-10 text-sm">
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
    </PageTransition>
  );
} 