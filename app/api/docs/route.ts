import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app', 'docs', 'LUNARA_TELEGRAM_CHANNEL.md');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Documentation file not found' 
      }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    
    return NextResponse.json({ 
      success: true, 
      content,
      lastModified: stats.mtime
    });
  } catch (error) {
    console.error('Error reading documentation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to read documentation' 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { content } = await request.json();
    const filePath = path.join(process.cwd(), 'app', 'docs', 'LUNARA_TELEGRAM_CHANNEL.md');
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'Documentation saved successfully' });
  } catch (error) {
    console.error('Error saving documentation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save documentation' 
    }, { status: 500 });
  }
}