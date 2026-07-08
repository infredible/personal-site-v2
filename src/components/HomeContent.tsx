'use client'

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ArrowRight, Pin } from "lucide-react";
import { formatDate, Post } from "@/app/lib/posts";
import { Project } from "@/app/lib/projects";
import { PageTransition, Stories, ProjectPreview } from "@/components";
import { useState, useEffect } from "react";

interface Story {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  objectFit: 'cover' | 'contain';
  padding?: string;
}

interface HomeContentProps {
  projects: Project[];
  posts: Post[];
  weatherDisplay: string;
  storiesData: Story[];
}

export function HomeContent({ projects, posts, weatherDisplay, storiesData }: HomeContentProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  // Preload all project preview images on component mount
  useEffect(() => {
    const preloadImages = () => {
      projects.forEach((project) => {
        if (project.metadata.ogImage) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = project.metadata.ogImage;
          document.head.appendChild(link);
        }
      });
    };

    preloadImages();
  }, [projects]);

  const handleProjectHover = (projectId: string, event: React.MouseEvent) => {
    setHoveredProject(projectId);
    setMouseX(event.clientX);
    setMouseY(event.clientY);
  };

  const handleProjectLeave = () => {
    setHoveredProject(null);
  };

  const getPreviewImage = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.metadata?.ogImage || null;
  };

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-24">
        <header className="mb-10 mt-14">
          <h1 className="text-3xl font-bold mb-1 font-serif leading-tight">Fred Zaw</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground mb-6">Oakland, CA</p>
            <p className="text-muted-foreground mb-6">•</p>
            <p className="text-muted-foreground mb-6">{weatherDisplay}</p>
          </div>
          
          <p className="text-base">
            Designer at <a href="https://clay.com/" target="_blank" rel="noopener noreferrer" className="text-foreground underline">Clay</a> working on AI and agentic capabilities. Previously at <a href="https://uniswap.org/" target="_blank" rel="noopener noreferrer" className="text-foreground underline">Uniswap Labs</a>{" "}
            unlocking a more free and open financial system, with earlier work spanning AI and spatial computing.
          </p>
          <nav className="mt-1">
            <Link href="/about" className="text-sm text-muted-foreground flex items-center gap-1 group h-[32px]">
              More
              <ArrowRight className="w-3.5 h-3.5 transition-transform translate-x-[-3px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </nav>
        </header>

        {/* Placeholder for screenshot - commented out until we have the image */}
        {/* <div className="mt-12 mb-16">
          <img
            src="/images/uniswap-screenshot.png"
            alt="Uniswap dashboard screenshot"
            className="rounded-lg w-full"
          />
        </div> */}

        {/* Stories Section */}
        <Stories stories={storiesData} />

        <section className="mb-24">
          <h2 className="text-2xl font-bold font-serif mb-10 leading-snug">Projects</h2>
          
          <div className="space-y-12">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/projects/${project.id}`}
                className="block group hover:opacity-70 transition-opacity"
                onMouseEnter={(e) => handleProjectHover(project.id, e)}
                onMouseLeave={handleProjectLeave}
                onMouseMove={(e) => {
                  setMouseX(e.clientX);
                  setMouseY(e.clientY);
                }}
              >
                <div>
                  <h3 className="text-base font-medium mb-1">
                    {project.metadata.title}
                  </h3>
                  <p className="text-muted-foreground">{project.metadata.description}</p>
                  <div className="flex items-center mt-1.75">
                    <Image 
                      src={project.metadata.company === 'Uniswap Labs' ? "/icons/uniswap.png" : "/icons/tiktok.png"} 
                      alt={project.metadata.company} 
                      width={16}
                      height={16}
                      className="w-4 h-4 mr-2 rounded-full"
                    />
                    <div className="flex items-center gap-2 pt-0.25 text-xs">
                      <span className="text-muted-foreground">{project.metadata.company}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{project.metadata.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-2xl font-bold font-serif mb-10 leading-snug">Thoughts</h2>
          
          <div className="space-y-8">
            {posts.map((post) => (
              <Link 
                key={post.id}
                href={`/posts/${post.id}`}
                className="block group hover:opacity-70 transition-opacity"
              >
                <div>
                  <h3 className="text-base font-medium mb-1">
                    {post.metadata.title}
                  </h3>
                  <p className="text-muted-foreground">{post.metadata.description}</p>
                  <div className="text-muted-foreground text-xs mt-2 flex items-center gap-2">
                    {post.metadata.featured && (
                      <>
                        <div className="flex items-center gap-1">
                          <Pin className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">Pinned</span>
                        </div>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatDate(post.metadata.date)}</span>
                    {post.metadata.tags?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{post.metadata.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-24">
        {/* <footer className="pt-14 border-t"> */}
          <h2 className="text-2xl font-bold font-serif mb-10 leading-snug">Elsewhere</h2>
          <div className="flex flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-4">
            <Link href="https://x.com/fredzaw" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group py-1 sm:py-0">
              Twitter
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            {/* <Link href="https://read.cv/fredzaw" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group py-1 sm:py-0">
              Read.cv
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link> */}
            <Link href="https://www.linkedin.com/in/fredzaw/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group py-1 sm:py-0">
              LinkedIn
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://www.instagram.com/_burmaboy/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group py-1 sm:py-0">
              Instagram
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://app.ens.domains/swappypapi.eth" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group py-1 sm:py-0">
              Swappypapi.eth
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        {/* </footer> */}
        </section>
      </div>

      {/* Project Preview */}
      <ProjectPreview
        imageUrl={hoveredProject ? getPreviewImage(hoveredProject) : null}
        isVisible={hoveredProject !== null}
        mouseX={mouseX}
        mouseY={mouseY}
      />
    </PageTransition>
  );
}
