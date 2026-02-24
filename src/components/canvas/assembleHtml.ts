import { type CanvasNode } from '@/stores/canvasStore';

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    const stripped = html
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head>[\s\S]*?<\/head>/i, '')
      .replace(/<\/?body[^>]*>/gi, '');
    return stripped.trim();
  }
  return html;
}

function extractStyles(html: string): string {
  const styles: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    styles.push(match[1]);
  }
  return styles.join('\n');
}

export function buildAssembledHtml(orderedPicked: CanvasNode[]): string {
  if (orderedPicked.length === 0) return '';

  const allStyles: string[] = [];
  const sections = orderedPicked.map((n) => {
    if (n.content) {
      allStyles.push(extractStyles(n.content));
      return extractBodyContent(n.content);
    }
    if (n.generatedCode) {
      return `<section style="padding:48px 32px;border-bottom:1px solid #e2e8f0;">
        <h2 style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:12px;">${n.title}</h2>
        <p style="font-size:12px;color:#64748b;line-height:1.8;">${n.description}</p>
      </section>`;
    }
    return '';
  }).filter(Boolean);

  const title = orderedPicked[0]?.title || 'My App';

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `<title>${title}</title>`,
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#f1f5f9; } }',
    allStyles.join('\n'),
    '</style>',
    '</head>',
    '<body>',
    ...sections,
    '<div style="text-align:center;padding:32px;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-top:1px solid #e2e8f0;">Built with Infinite Canvas IDE</div>',
    '</body>',
    '</html>',
  ].join('\n');
}
