import type { MetadataRoute } from 'next'
import { siteConfig } from '@/app/config/site'

// Endpoints with no standalone value in a search index or an LLM context
// window. /api/markdown is deliberately NOT here: it serves clean source MDX
// for any post or project, which is the most useful thing on this site for a
// crawler or agent to read.
const disallowedApiRoutes = ['/api/og', '/api/explain']

// AI crawlers are allowed on purpose, not by omission. Being cited by
// assistants is a goal for this site, so consent is stated explicitly rather
// than left to the `*` default.
//
// Two of these are training-preference tokens rather than crawlers:
// Google-Extended (Gemini) and Applebot-Extended (Apple Intelligence). Neither
// affects normal search crawling — Google AI Overviews inclusion is governed by
// the Googlebot grant below, not by Google-Extended.
const aiUserAgents = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowedApiRoutes,
      },
      {
        userAgent: aiUserAgents,
        allow: '/',
        disallow: disallowedApiRoutes,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
