import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Fred Zaw';
    const subtitle = searchParams.get('subtitle') || searchParams.get('date') || '';

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h1
              style={{
                fontSize: '72px',
                fontWeight: '600',
                color: '#ffffff',
                lineHeight: '1.1',
                margin: '0',
                maxWidth: '900px',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  fontSize: '32px',
                  color: '#a1a1aa',
                  margin: '0',
                  fontWeight: '400',
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
                color: '#71717a',
                fontWeight: '500',
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
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                }}
              />
              <span
                style={{
                  fontSize: '24px',
                  color: '#71717a',
                }}
              >
                Online
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image generation error:', e.message);
    return new Response('Failed to generate OG image', {
      status: 500,
    });
  }
} 