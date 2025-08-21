import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { persona } = await req.json();

  if (!persona) {
    return new Response('Missing persona prompt', { status: 400 });
  }

  const prompt = `
  You are creating a COMPLETE persona transformation for a personal website. Generate entirely NEW content as if this website belongs to: "${persona}"

  This is satirical parody - use ALL the buzzwords, corporate speak, and clichés that this type of person would use. Make it an exaggerated and humorous satire of that profession. It should be obvious to the reader that this is a parody - ridiculous and over the top.

  CRITICAL: Create entirely NEW and REALISTIC projects and posts that this persona would actually have in their portfolio. Do NOT transform existing projects - create completely different ones that fit their company/role.

  Return a JSON object with this EXACT structure:
  {
    "bio": "2-3 sentences in this persona's voice with their typical buzzwords",
    "location": "Menlo Park, CA (or location fitting the persona)",
    "projects": [
      {
        "id": "project-1",
        "title": "Realistic project title this persona would have",
        "description": "Detailed description in their voice with industry jargon",
        "company": "Company name if applicable"
      },
      {
        "id": "project-2", 
        "title": "Another realistic project",
        "description": "Another project description",
        "company": "Company name"
      },
      {
        "id": "project-3",
        "title": "Third project title",
        "description": "Third project description", 
        "company": "Company name"
      }
    ],
    "posts": [
      {
        "id": "post-1",
        "title": "Blog post title this persona would write",
        "description": "Post description in their voice"
      },
      {
        "id": "post-2",
        "title": "Another post title",
        "description": "Another post description"
      },
      {
        "id": "post-3", 
        "title": "Third post title",
        "description": "Third post description"
      },
      {
        "id": "post-4",
        "title": "Fourth post title", 
        "description": "Fourth post description"
      },
      {
        "id": "post-5",
        "title": "Fifth post title",
        "description": "Fifth post description"
      },
      {
        "id": "post-6",
        "title": "Sixth post title",
        "description": "Sixth post description"
      }
    ]
  }

  EXAMPLES by persona type:

  **FAANG Designer (Google/Meta/Apple/etc):**
  - Projects: "News Feed algorithm transparency dashboard", "YouTube Shorts creator analytics", "Gmail Smart Compose v3.0"
  - Posts: "How we increased user engagement by 47% through micro-interactions", "The science behind conversion funnel optimization"
  - Language: "user engagement," "conversion funnels," "growth hacking," "data-driven design," "10x impact," "OKRs," "A/B tested"

  **Startup Founder/Product:**
  - Projects: "AI-powered SaaS platform for B2B automation", "Marketplace disruption through blockchain", "Series A pitch deck design"
  - Posts: "Why we're disrupting the $50B legacy industry", "From 0 to product-market fit in 8 months"
  - Language: "disrupting," "unicorn potential," "product-market fit," "scaling," "Series A runway," "MVP," "hockey stick growth"

  **Design Consultant/Agency:**
  - Projects: "Strategic design transformation for Fortune 500", "Omnichannel experience optimization", "Brand identity system 2.0"  
  - Posts: "Synergizing stakeholder alignment through design thinking", "Best practices for enterprise UX at scale"
  - Language: "strategic initiatives," "synergistic solutions," "best practices," "stakeholder alignment," "holistic approach"

  **Crypto/Web3:**
  - Projects: "DeFi protocol governance dashboard", "NFT marketplace user experience", "DAO voting mechanism design"
  - Posts: "The future of decentralized identity", "Why Web3 UX is still broken (and how to fix it)"
  - Language: "decentralized," "trustless," "permissionless," "tokenomics," "community-driven," "on-chain"

  **E-commerce/Marketplace:**
  - Projects: "Conversion rate optimization for checkout flow", "Seller onboarding experience redesign", "Personalization engine UI"
  - Posts: "How we reduced cart abandonment by 32%", "The psychology of e-commerce trust signals"
  - Language: "conversion optimization," "customer lifetime value," "retention metrics," "personalization at scale"

  Make the satire clever but believable. Each persona should be instantly recognizable from their language and project types.
  
  CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations, no additional text. Start with { and end with }. Ensure all strings are properly escaped and quoted.`;

  let content: string | null | undefined;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that transforms personal website content. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response and parse the JSON
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing text that isn't JSON
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('No valid JSON found in response:', cleanContent);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    
    // Log the cleaned content for debugging
    console.log('Cleaned content length:', cleanContent.length);
    console.log('Cleaned content preview:', cleanContent.substring(0, 200) + '...');
    
    // Try to parse JSON, with fallback cleaning
    let transformedContent;
    try {
      transformedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.log('First parse failed, attempting to fix common JSON issues...');
      
      // Try to fix common JSON issues
      let fixedContent = cleanContent
        // Fix unescaped quotes in strings (basic attempt)
        .replace(/: "([^"]*)"([^",}\]]*)"([^"]*)",/g, ': "$1\\"$2\\"$3",')
        .replace(/: "([^"]*)"([^",}\]]*)"([^"]*)"$/g, ': "$1\\"$2\\"$3"')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1');
      
      transformedContent = JSON.parse(fixedContent);
    }
    
    return new Response(JSON.stringify(transformedContent), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Transform API error:', error);
    
    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      console.error('JSON Parse Error - Raw content:', content?.substring(0, 500));
      return new Response('Invalid JSON response from AI', { status: 500 });
    }
    
    return new Response('Failed to transform content', { status: 500 });
  }
}
