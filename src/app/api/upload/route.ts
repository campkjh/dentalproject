import { put, list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = formData.get('folder') as string || 'images';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const blob = await put(`${folder}/${file.name}`, file, {
    access: 'public',
  });

  return NextResponse.json(blob);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder') || '';

  const { blobs } = await list({ prefix: folder ? `${folder}/` : undefined });

  return NextResponse.json({ blobs });
}

export async function DELETE(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'No url provided' }, { status: 400 });
  }

  await del(url);

  return NextResponse.json({ deleted: true });
}
