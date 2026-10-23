import studio from './studio.html?raw';

export function GET() {
  return new Response(studio, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
}
