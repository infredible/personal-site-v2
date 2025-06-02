import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const type = searchParams.get('type') // 'post' or 'project'

  if (!slug || !type) {
    return NextResponse.json({ error: 'Missing slug or type parameter' }, { status: 400 })
  }

  if (type !== 'post' && type !== 'project') {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  }

  try {
    const filePath = join(process.cwd(), 'src', 'app', 'content', `${type}s`, `${slug}.mdx`)
    const content = await readFile(filePath, 'utf-8')
    
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error reading markdown file:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
} 