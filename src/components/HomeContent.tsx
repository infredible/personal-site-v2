'use client'

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ArrowRight, Pin } from "lucide-react";
import { formatDate, Post } from "@/app/lib/posts";
import { Project } from "@/app/lib/projects";
import { PageTransition, Stories, ProjectPreview, ChatBox } from "@/components";
import { useState, useEffect } from "react";

interface Story {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  objectFit: 'cover' | 'contain';
  padding?: string;
}

interface TransformedProject {
  id: string;
  title: string;
  description: string;
  company?: string;
}

interface TransformedPost {
  id: string;
  title: string;
  description: string;
}

interface TransformedContent {
  bio: string;
  location: string;
  projects: TransformedProject[];
  posts: TransformedPost[];
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
  const [transformedContent, setTransformedContent] = useState<TransformedContent | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

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

  const handleTransform = async (persona: string) => {
    setIsTransforming(true);
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ persona }),
      });

      if (!response.ok) {
        throw new Error('Failed to transform content');
      }

      const transformed = await response.json();
      setTransformedContent(transformed);
    } catch (error) {
      console.error('Transform error:', error);
      // You could add error state handling here
    } finally {
      setIsTransforming(false);
    }
  };

  const handleReset = () => {
    setTransformedContent(null);
  };

  // Helper functions to get displayed content
  const getDisplayedBio = () => {
    if (transformedContent) {
      return transformedContent.bio;
    }
    return "Designer at Uniswap Labs unlocking a more free and open financial system. Before crypto, worked on a breadth of industries including AI and spatial computing.";
  };

  const getDisplayedLocation = () => {
    if (transformedContent) {
      return transformedContent.location;
    }
    return "Oakland, CA";
  };

  const getDisplayedProjects = () => {
    if (transformedContent) {
      return transformedContent.projects;
    }
    return projects;
  };

  const getDisplayedPosts = () => {
    if (transformedContent) {
      return transformedContent.posts;
    }
    return posts;
  };

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-6 py-24">
        <header className="mb-10 mt-14">
          <h1 className="text-3xl font-medium mb-1 font-serif">Fred Zaw</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground mb-6">{getDisplayedLocation()}</p>
            <p className="text-muted-foreground mb-6">•</p>
            <p className="text-muted-foreground mb-6">{weatherDisplay}</p>
          </div>
          
          <p className="text-base">
            {getDisplayedBio()}
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
          <h2 className="text-2xl font-medium font-serif mb-10">Projects</h2>
          
          <div className="space-y-12">
            {getDisplayedProjects().map((project) => {
              const isTransformed = transformedContent !== null;
              const projectId = project.id;
              const projectTitle = isTransformed ? (project as TransformedProject).title : (project as Project).metadata.title;
              const projectDescription = isTransformed ? (project as TransformedProject).description : (project as Project).metadata.description;
              const projectCompany = isTransformed ? (project as TransformedProject).company || 'Company' : (project as Project).metadata.company;
              const projectDate = isTransformed ? '2024' : (project as Project).metadata.date;
              
              return (
                <Link 
                  key={projectId} 
                  href={isTransformed ? '#' : `/projects/${projectId}`}
                  className="block group hover:opacity-70 transition-opacity"
                  onMouseEnter={(e) => handleProjectHover(projectId, e)}
                  onMouseLeave={handleProjectLeave}
                  onMouseMove={(e) => {
                    setMouseX(e.clientX);
                    setMouseY(e.clientY);
                  }}
                >
                  <div>
                    <h3 className="text-md font-medium mb-1">
                      {projectTitle}
                    </h3>
                    <p>{projectDescription}</p>
                    <div className="flex items-center mt-1.75">
                      <Image 
                        src={projectCompany === 'Uniswap Labs' ? "/icons/uniswap.png" : 
                             projectCompany?.toLowerCase().includes('meta') ? "/icons/stripe.png" :
                             projectCompany?.toLowerCase().includes('google') ? "/icons/stripe.png" :
                             "/icons/tiktok.png"} 
                        alt={projectCompany} 
                        width={16}
                        height={16}
                        className="w-4 h-4 mr-2 rounded-full"
                      />
                      <div className="flex items-center gap-2 pt-0.25 text-xs">
                        <span className="text-muted-foreground">{projectCompany}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{projectDate}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-2xl font-medium font-serif mb-10">Thoughts</h2>
          
          <div className="space-y-8">
            {getDisplayedPosts().map((post) => {
              const isTransformed = transformedContent !== null;
              const postId = post.id;
              const postTitle = isTransformed ? (post as TransformedPost).title : (post as Post).metadata.title;
              const postDescription = isTransformed ? (post as TransformedPost).description : (post as Post).metadata.description;
              const postDate = isTransformed ? '2024-01-01' : (post as Post).metadata.date;
              const postFeatured = isTransformed ? false : (post as Post).metadata.featured;
              const postTags = isTransformed ? [] : (post as Post).metadata.tags || [];
              
              return (
                <Link 
                  key={postId}
                  href={isTransformed ? '#' : `/posts/${postId}`}
                  className="block group hover:opacity-70 transition-opacity"
                >
                  <div>
                    <h3 className="text-md font-medium mb-1">
                      {postTitle}
                    </h3>
                    <p>{postDescription}</p>
                    <div className="text-muted-foreground text-xs mt-2 flex items-center gap-2">
                      {postFeatured && (
                        <>
                          <div className="flex items-center gap-1">
                            <Pin className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Pinned</span>
                          </div>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDate(postDate)}</span>
                      {postTags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{postTags.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-24">
        {/* <footer className="pt-14 border-t"> */}
          <h2 className="text-2xl font-medium font-serif mb-10">Elsewhere</h2>
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

      {/* Chat Box */}
      <ChatBox
        onTransform={handleTransform}
        onReset={handleReset}
        isTransformed={transformedContent !== null}
        isLoading={isTransforming}
      />
    </PageTransition>
  );
}
