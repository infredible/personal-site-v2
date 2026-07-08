import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

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

    // Load the custom fonts and avatar image using fetch (works in Edge Runtime)
    const baseUrl = new URL(request.url).origin;
    
    const garamondBoldResponse = await fetch(`${baseUrl}/fonts/EBGaramond-Bold.ttf`);
    const garamondBold = await garamondBoldResponse.arrayBuffer();
    
    const untitledSansRegularResponse = await fetch(`${baseUrl}/fonts/UntitledSans-Regular.ttf`);
    const untitledSansRegular = await untitledSansRegularResponse.arrayBuffer();
    
    const untitledSansMediumResponse = await fetch(`${baseUrl}/fonts/UntitledSans-Medium.ttf`);
    const untitledSansMedium = await untitledSansMediumResponse.arrayBuffer();

    // Load the avatar image
    const avatarResponse = await fetch(`${baseUrl}/avatar.png`);
    const avatarArrayBuffer = await avatarResponse.arrayBuffer();
    const avatarBase64 = Buffer.from(avatarArrayBuffer).toString('base64');
    const avatarDataUrl = `data:image/png;base64,${avatarBase64}`;

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
                fontSize: '80px',
                fontWeight: '700', // Using bold weight since we loaded EB Garamond Bold
                color: '#fcfcfc', // oklch(0.985 0.001 106.423) - foreground color
                lineHeight: '1.2',
                margin: '0',
                maxWidth: '900px',
                fontFamily: '"EB Garamond", Georgia, "Times New Roman", serif', // Using EB Garamond serif first
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
              alignItems: 'flex-end',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                color: '#b5b6ba', // muted-foreground color
                fontWeight: '400',
                fontFamily: 'UntitledSans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              fredz.website
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
              }}
            >
              <img
                src={avatarDataUrl}
                alt="Fred Zaw Avatar"
                style={{
                  width: '240px',
                  height: '240px',
                  borderRadius: '120px',
                  objectFit: 'cover',
                }}
              />
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'EB Garamond',
            data: garamondBold,
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