import { type CanvasNode } from '@/stores/canvasStore';

export function buildAssembledHtml(orderedPicked: CanvasNode[]): string {
  if (orderedPicked.length === 0) return '';

  const sections = orderedPicked.map((n) => {
    if (n.content) return n.content;
    if (n.generatedCode) {
      const el = document.createElement('section');
      el.style.cssText = 'padding:48px 32px;border-bottom:1px solid #e2e8f0;';
      const h2 = document.createElement('h2');
      h2.style.cssText = 'font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:12px;';
      h2.textContent = n.title;
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px;color:#64748b;line-height:1.8;';
      p.textContent = n.description;
      el.appendChild(h2);
      el.appendChild(p);
      return el.outerHTML;
    }
    return '';
  }).filter(Boolean);

  const navLinks = ['Home', 'Features', 'Pricing', 'Contact'];
  const navLinksHtml = navLinks.map((l) =>
    '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;text-decoration:none;">' + l + '</a>'
  ).join('');

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<title>Assembled App</title>',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#f1f5f9; } }',
    '</style>',
    '</head>',
    '<body>',
    '<nav style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">',
    '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;">&#10022;</div>',
    '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">My App</span>',
    '<div style="display:flex;gap:24px;margin-left:auto;">' + navLinksHtml + '</div>',
    '</nav>',
    ...sections,
    '<div style="text-align:center;padding:32px;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-top:1px solid #e2e8f0;">Built with &#10022; Infinite Canvas IDE</div>',
    '</body>',
    '</html>',
  ].join('\n');
}
