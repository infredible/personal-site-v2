import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'edge';

// Function to format date strings
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      return dateString; // Return original if not a valid date
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString; // Return original if parsing fails
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Fred Zaw';
    const rawSubtitle = searchParams.get('subtitle') || searchParams.get('date') || '';
    
    // Format the subtitle if it's a date
    const subtitle = rawSubtitle ? formatDate(rawSubtitle) : '';

    // Load the custom fonts
    const familyBold = await readFile(join(process.cwd(), 'public/fonts/Family-Bold.ttf'));
    const untitledSansRegular = await readFile(join(process.cwd(), 'public/fonts/UntitledSans-Regular.ttf'));
    const untitledSansMedium = await readFile(join(process.cwd(), 'public/fonts/UntitledSans-Medium.ttf'));

    return new ImageResponse(
      (
        <div
          style={{
            // Using the dark theme background color from globals.css
            background: '#25272c', // oklch(0.147 0.004 49.25) converted to hex
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '80px',
            fontFamily: 'UntitledSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h1
              style={{
                fontSize: '72px',
                fontWeight: '700', // Using bold weight since we loaded Family-Bold
                color: '#fcfcfc', // oklch(0.985 0.001 106.423) - foreground color
                lineHeight: '1.1',
                margin: '0',
                maxWidth: '900px',
                fontFamily: 'Family, Georgia, "Times New Roman", serif', // Using Family font first
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: '32px',
                  color: '#b5b6ba', // oklch(0.709 0.01 56.259) - muted-foreground color
                  margin: '0',
                  fontWeight: '400',
                  fontFamily: 'UntitledSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                color: '#b5b6ba', // muted-foreground color
                fontWeight: '500',
                fontFamily: 'UntitledSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              fredzaw.com
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Family',
            data: familyBold,
            style: 'normal',
            weight: 700,
          },
          {
            name: 'UntitledSans',
            data: untitledSansRegular,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'UntitledSans',
            data: untitledSansMedium,
            style: 'normal',
            weight: 500,
          },
        ],
      }
    );
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('OG Image generation error:', error.message);
    return new Response('Failed to generate OG image', {
      status: 500,
    });
  }
} 