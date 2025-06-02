import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAllProjects } from "@/app/lib/projects";
import { getAllPosts, formatDate } from "@/app/lib/posts";
import { getWeather, formatTemperature } from "@/app/lib/weather";
import { PageTransition } from "@/components";

export default async function Home() {
  const projects = await getAllProjects();
  const posts = await getAllPosts();
  
  // Fetch weather data, with fallback for errors
  let weatherDisplay = "70°F"; // Fallback temperature
  try {
    const weather = await getWeather();
    weatherDisplay = formatTemperature(weather.current.temperature_2m);
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    // Keep the fallback value
  }

  return (
    <PageTransition>
      <div className="max-w-xl mx-auto px-6 py-24">
        <header className="mb-24 mt-20">
          <h1 className="text-3xl font-medium mb-1 font-serif">Fred Zaw</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground mb-6">Oakland, CA</p>
            <p className="text-muted-foreground mb-6">•</p>
            <p className="text-muted-foreground mb-6">{weatherDisplay}</p>
          </div>
          
          <p className="text-base">
            Designer at Uniswap Labs unlocking a more free and open financial system. 
            Before crypto, worked on a breadth of industries including AI and spatial computing.
          </p>
        </header>

        {/* Placeholder for screenshot - commented out until we have the image */}
        {/* <div className="mt-12 mb-16">
          <img
            src="/images/uniswap-screenshot.png"
            alt="Uniswap dashboard screenshot"
            className="rounded-lg w-full"
          />
        </div> */}

        <section className="mb-24">
          <h2 className="text-2xl font-medium font-serif mb-10">Projects</h2>
          
          <div className="space-y-12">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/projects/${project.id}`}
                className="block group hover:opacity-70 transition-opacity"
              >
                <div>
                  <h3 className="text-md font-medium mb-1">
                    {project.metadata.title}
                  </h3>
                  <p>{project.metadata.description}</p>
                  <div className="flex items-center mt-2">
                    <img 
                      src={project.metadata.company === 'Uniswap Labs' ? "/icons/uniswap.png" : "/icons/tiktok.png"} 
                      alt={project.metadata.company} 
                      className="w-4 h-4 mr-2 rounded-full"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-sm">{project.metadata.company}</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">{project.metadata.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-2xl font-medium font-serif mb-10">Thoughts</h2>
          
          <div className="space-y-8">
            {posts.map((post) => (
              <Link 
                key={post.id}
                href={`/posts/${post.id}`}
                className="block group hover:opacity-70 transition-opacity"
              >
                <div>
                  <h3 className="text-md font-medium mb-1">
                    {post.metadata.title}
                  </h3>
                  <p>{post.metadata.description}</p>
                  <p className="text-muted-foreground text-sm mt-2">{formatDate(post.metadata.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pt-14 border-t">
          <h2 className="text-2xl font-medium font-serif mb-4 mt-6">Elsewhere</h2>
          <div className="flex space-x-6">
            <Link href="https://twitter.com" className="text-muted-foreground flex items-center gap-1 group">
              Twitter
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://read.cv" className="text-muted-foreground flex items-center gap-1 group">
              Read.cv
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://instagram.com" className="text-muted-foreground flex items-center gap-1 group">
              Instagram
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
