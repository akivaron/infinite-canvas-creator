import { type UIVariation } from '@/stores/canvasStore';

let variationCounter = 0;

function makePreviewHtml(title: string, bodyContent: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en"><head>',
    '<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#f1f5f9; } }',
    'section { padding: 48px 32px; }',
    '.container { max-width: 960px; margin: 0 auto; }',
    'h1,h2,h3 { font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; }',
    'p { font-size:12px; color:#64748b; line-height:1.8; }',
    '.btn { display:inline-block; padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }',
    '@media (prefers-color-scheme:dark) { .btn { background:#fff; color:#000; } }',
    '.card { padding:24px; border-radius:20px; background:#fff; border:1px solid #e2e8f0; }',
    '@media (prefers-color-scheme:dark) { .card { background:#0c0c0e; border-color:#1c1c1f; } }',
    '</style></head><body>',
    bodyContent,
    '</body></html>',
  ].join('\n');
}

export function generateVariations(title: string, description: string): UIVariation[] {
  const desc = description || 'A beautifully crafted solution built with modern design principles.';

  return [
    {
      id: `var-${++variationCounter}`,
      label: 'Navbar – Minimal',
      description: 'Clean minimal navigation bar with logo and links.',
      category: 'header',
      previewHtml: makePreviewHtml(title, [
        '<nav style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">',
        '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;">&#10022;</div>',
        '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
        '<div style="display:flex;gap:24px;margin-left:auto;">',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;text-decoration:none;">Home</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;text-decoration:none;">Features</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;text-decoration:none;">Pricing</a>',
        '</div></nav>',
      ].join('')),
      code: '// Navbar component for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Hero – Centered',
      description: 'Centered hero section with headline, description, and CTA button.',
      category: 'hero',
      previewHtml: makePreviewHtml(title, [
        '<section style="text-align:center;padding:80px 32px;">',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">Introducing</p>',
        '<h1 style="font-size:36px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">' + title + '</h1>',
        '<p style="max-width:480px;margin:0 auto 32px;">' + desc + '</p>',
        '<button class="btn">Get Started</button>',
        '</section>',
      ].join('')),
      code: '// Hero section for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Hero – Split Layout',
      description: 'Two-column hero with text on left and visual placeholder on right.',
      category: 'hero',
      previewHtml: makePreviewHtml(title, [
        '<section style="display:flex;align-items:center;gap:48px;padding:80px 48px;">',
        '<div style="flex:1;">',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">New</p>',
        '<h1 style="font-size:32px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">' + title + '</h1>',
        '<p style="margin-bottom:24px;">' + desc + '</p>',
        '<button class="btn">Learn More</button>',
        '</div>',
        '<div style="flex:1;height:300px;border-radius:20px;background:linear-gradient(135deg,#6366f120,#8b5cf620);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;">',
        '<span style="font-size:48px;opacity:0.3;">&#10022;</span>',
        '</div></section>',
      ].join('')),
      code: '// Hero split layout for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Features – 3 Column',
      description: 'Three-column feature grid with icons, titles, and descriptions.',
      category: 'features',
      previewHtml: makePreviewHtml(title, [
        '<section style="padding:64px 32px;">',
        '<div class="container">',
        '<h2 style="font-size:24px;text-align:center;margin-bottom:48px;">Features</h2>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">',
        ['Performance', 'Security', 'Scalability'].map((f) =>
          '<div class="card"><div style="width:48px;height:48px;border-radius:14px;background:#6366f110;display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#6366f1;font-size:20px;">&#10022;</div><h3 style="font-size:14px;margin-bottom:8px;">' + f + '</h3><p>Built for modern workflows with best practices.</p></div>'
        ).join(''),
        '</div></div></section>',
      ].join('')),
      code: '// Features grid for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Features – Icon List',
      description: 'Vertical list of features with icons and descriptions.',
      category: 'features',
      previewHtml: makePreviewHtml(title, [
        '<section style="padding:64px 32px;">',
        '<div style="max-width:600px;margin:0 auto;">',
        '<h2 style="font-size:24px;margin-bottom:32px;">Why Choose Us</h2>',
        ['Lightning Fast', 'Always Secure', 'Easy to Scale'].map((f) =>
          '<div style="display:flex;gap:16px;align-items:start;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e2e8f0;"><div style="width:40px;height:40px;border-radius:12px;background:#6366f110;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#6366f1;">&#10022;</div><div><h3 style="font-size:13px;font-weight:900;text-transform:uppercase;margin-bottom:4px;">' + f + '</h3><p>Designed with care for the best experience.</p></div></div>'
        ).join(''),
        '</div></section>',
      ].join('')),
      code: '// Feature list for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Pricing – 3 Tiers',
      description: 'Three-tier pricing table with highlighted popular plan.',
      category: 'pricing',
      previewHtml: makePreviewHtml(title, [
        '<section style="padding:64px 32px;text-align:center;">',
        '<h2 style="font-size:24px;margin-bottom:48px;">Pricing</h2>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px;margin:0 auto;">',
        [['Starter', '$9', 'bg:#fff'], ['Pro', '$29', 'bg:#0f172a'], ['Enterprise', '$99', 'bg:#fff']].map(([name, price, _bg], i) =>
          '<div class="card" style="' + (i === 1 ? 'background:#0f172a;color:#fff;border-color:#0f172a;' : '') + 'text-align:center;padding:32px;"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;' + (i === 1 ? 'color:#a5b4fc;' : 'color:#6366f1;') + 'margin-bottom:8px;">' + name + '</p><p style="font-size:36px;font-weight:900;margin-bottom:16px;' + (i === 1 ? 'color:#fff;' : 'color:#0f172a;') + '">' + price + '</p><p style="margin-bottom:24px;' + (i === 1 ? 'color:#94a3b8;' : '') + '">Per month, billed annually</p><button class="btn" style="width:100%;' + (i === 1 ? 'background:#fff;color:#0f172a;' : '') + '">Choose Plan</button></div>'
        ).join(''),
        '</div></section>',
      ].join('')),
      code: '// Pricing table for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Dashboard – Analytics',
      description: 'Dashboard layout with sidebar and metric cards.',
      category: 'dashboard',
      previewHtml: makePreviewHtml(title, [
        '<div style="display:flex;min-height:400px;">',
        '<aside style="width:200px;padding:24px;border-right:1px solid #e2e8f0;">',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px;">' + title + '</p>',
        ['Overview', 'Analytics', 'Users', 'Settings'].map((i) =>
          '<p style="padding:8px 12px;margin-bottom:4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">' + i + '</p>'
        ).join(''),
        '</aside>',
        '<main style="flex:1;padding:32px;">',
        '<h2 style="font-size:20px;font-weight:900;text-transform:uppercase;margin-bottom:24px;">Dashboard</h2>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">',
        ['Revenue', 'Users', 'Orders'].map((m) =>
          '<div class="card"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">' + m + '</p><p style="font-size:28px;font-weight:900;">' + (Math.floor(Math.random() * 9000) + 1000) + '</p></div>'
        ).join(''),
        '</div></main></div>',
      ].join('')),
      code: '// Dashboard for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Mobile – App Screen',
      description: 'Mobile-first app screen with bottom tab bar.',
      category: 'mobile',
      previewHtml: makePreviewHtml(title, [
        '<div style="width:320px;height:568px;margin:20px auto;border-radius:32px;border:1px solid #e2e8f0;overflow:hidden;display:flex;flex-direction:column;">',
        '<div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">',
        '<span style="font-size:10px;font-weight:900;">9:41</span>',
        '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
        '<span style="font-size:10px;">...</span></div>',
        '<div style="flex:1;padding:12px;overflow-y:auto;">',
        ['Welcome', 'Recent', 'Actions'].map((s) =>
          '<div class="card" style="margin-bottom:12px;border-radius:16px;padding:16px;"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:4px;">' + s + '</p><p>Tap to explore details.</p></div>'
        ).join(''),
        '</div>',
        '<div style="display:flex;justify-content:space-around;padding:12px;border-top:1px solid #e2e8f0;">',
        ['Home', 'Search', 'Profile'].map((t) =>
          '<span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">' + t + '</span>'
        ).join(''),
        '</div></div>',
      ].join('')),
      code: '// Mobile app for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Footer – Columns',
      description: 'Multi-column footer with links and branding.',
      category: 'footer',
      previewHtml: makePreviewHtml(title, [
        '<footer style="padding:64px 32px;border-top:1px solid #e2e8f0;">',
        '<div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;">',
        '<div>',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">' + title + '</p>',
        '<p>' + desc + '</p></div>',
        ['Product', 'Company', 'Legal'].map((col) =>
          '<div><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">' + col + '</p>' +
          ['Link 1', 'Link 2', 'Link 3'].map((l) =>
            '<p style="margin-bottom:8px;"><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">' + l + '</a></p>'
          ).join('') + '</div>'
        ).join(''),
        '</div>',
        '<div style="max-width:960px;margin:24px auto 0;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">',
        '<p style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">&copy; 2026 ' + title + '. All rights reserved.</p>',
        '</div></footer>',
      ].join('')),
      code: '// Footer for ' + title,
    },
  ];
}
