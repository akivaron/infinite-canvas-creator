import { type UIVariation } from '@/stores/canvasStore';

let variationCounter = 0;

function makePreviewHtml(bodyContent: string, isMobile = false): string {
  const mobileWrapper = isMobile
    ? 'max-width:390px;margin:0 auto;min-height:100vh;'
    : '';
  return [
    '<!DOCTYPE html>',
    '<html lang="en"><head>',
    '<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a;' + mobileWrapper + ' }',
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

/* ── Web page templates ────────────────────── */

function webNavbar(title: string): UIVariation[] {
  return [
    {
      id: `var-${++variationCounter}`,
      label: 'Navbar – Minimal',
      description: 'Clean minimal navigation with logo and links.',
      category: 'header',
      previewHtml: makePreviewHtml([
        '<nav style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">',
        '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;">&#10022;</div>',
        '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
        '<div style="display:flex;gap:24px;margin-left:auto;">',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Home</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Features</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Pricing</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Contact</a>',
        '</div></nav>',
      ].join('')),
      code: '// Navbar for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Navbar – Centered',
      description: 'Centered navigation with logo in the middle.',
      category: 'header',
      previewHtml: makePreviewHtml([
        '<nav style="padding:20px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;gap:32px;position:relative;">',
        '<div style="display:flex;gap:20px;position:absolute;left:32px;">',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Home</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">About</a>',
        '</div>',
        '<div style="display:flex;align-items:center;gap:8px;">',
        '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:14px;">&#10022;</div>',
        '<span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
        '</div>',
        '<div style="display:flex;gap:20px;position:absolute;right:32px;">',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Pricing</a>',
        '<a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Contact</a>',
        '</div>',
        '</nav>',
      ].join('')),
      code: '// Centered navbar for ' + title,
    },
  ];
}

function webHero(title: string, desc: string): UIVariation[] {
  return [
    {
      id: `var-${++variationCounter}`,
      label: 'Hero – Centered',
      description: 'Centered hero with headline, description, and CTA.',
      category: 'hero',
      previewHtml: makePreviewHtml([
        '<section style="text-align:center;padding:100px 32px;">',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">Introducing</p>',
        '<h1 style="font-size:40px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">' + title + '</h1>',
        '<p style="max-width:520px;margin:0 auto 32px;">' + desc + '</p>',
        '<div style="display:flex;gap:12px;justify-content:center;">',
        '<button class="btn">Get Started</button>',
        '<button class="btn" style="background:transparent;color:#0f172a;border:1px solid #e2e8f0;">Learn More</button>',
        '</div></section>',
      ].join('')),
      code: '// Hero centered for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Hero – Split',
      description: 'Two-column hero with text left and visual right.',
      category: 'hero',
      previewHtml: makePreviewHtml([
        '<section style="display:flex;align-items:center;gap:48px;padding:80px 48px;min-height:500px;">',
        '<div style="flex:1;">',
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">New</p>',
        '<h1 style="font-size:36px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">' + title + '</h1>',
        '<p style="margin-bottom:24px;">' + desc + '</p>',
        '<button class="btn">Get Started</button>',
        '</div>',
        '<div style="flex:1;height:340px;border-radius:24px;background:linear-gradient(135deg,#6366f120,#8b5cf620);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;">',
        '<span style="font-size:64px;opacity:0.2;">&#10022;</span>',
        '</div></section>',
      ].join('')),
      code: '// Hero split for ' + title,
    },
  ];
}

function webFeatures(title: string): UIVariation[] {
  return [
    {
      id: `var-${++variationCounter}`,
      label: 'Features – 3 Column',
      description: 'Three-column feature cards with icons.',
      category: 'features',
      previewHtml: makePreviewHtml([
        '<section style="padding:80px 32px;"><div class="container">',
        '<h2 style="font-size:28px;text-align:center;margin-bottom:12px;">Features</h2>',
        '<p style="text-align:center;max-width:480px;margin:0 auto 48px;">Everything you need to build amazing products.</p>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">',
        ['⚡ Performance', '🔒 Security', '📱 Responsive', '🎨 Design', '🚀 Speed', '💡 Innovation'].map((f) => {
          const [icon, name] = f.split(' ');
          return '<div class="card"><div style="font-size:24px;margin-bottom:12px;">' + icon + '</div><h3 style="font-size:14px;margin-bottom:8px;">' + name + '</h3><p>Built for modern workflows with best-in-class tooling.</p></div>';
        }).join(''),
        '</div></div></section>',
      ].join('')),
      code: '// Features for ' + title,
    },
    {
      id: `var-${++variationCounter}`,
      label: 'Features – Bento Grid',
      description: 'Modern bento-style grid layout.',
      category: 'features',
      previewHtml: makePreviewHtml([
        '<section style="padding:80px 32px;"><div class="container">',
        '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">What We Offer</h2>',
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,200px);gap:16px;">',
        '<div class="card" style="grid-column:span 2;display:flex;align-items:center;padding:32px;"><div><h3 style="font-size:20px;margin-bottom:8px;">Blazing Fast</h3><p>Optimized for speed at every layer of the stack.</p></div></div>',
        '<div class="card" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;"><div style="font-size:36px;margin-bottom:8px;">🔒</div><h3 style="font-size:14px;">Secure</h3></div></div>',
        '<div class="card" style="display:flex;align-items:center;justify-content:center;"><div style="text-align:center;"><div style="font-size:36px;margin-bottom:8px;">📊</div><h3 style="font-size:14px;">Analytics</h3></div></div>',
        '<div class="card" style="grid-column:span 2;display:flex;align-items:center;padding:32px;"><div><h3 style="font-size:20px;margin-bottom:8px;">Scale Infinitely</h3><p>From zero to millions of users without breaking a sweat.</p></div></div>',
        '</div></div></section>',
      ].join('')),
      code: '// Bento features for ' + title,
    },
  ];
}

function webPricing(title: string): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'Pricing – 3 Tiers',
    description: 'Three-tier pricing with highlighted popular plan.',
    category: 'pricing',
    previewHtml: makePreviewHtml([
      '<section style="padding:80px 32px;text-align:center;">',
      '<h2 style="font-size:28px;margin-bottom:12px;">Pricing</h2>',
      '<p style="max-width:400px;margin:0 auto 48px;">Simple, transparent pricing for everyone.</p>',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px;margin:0 auto;">',
      [['Starter', '$9', false], ['Pro', '$29', true], ['Enterprise', '$99', false]].map(([name, price, pop]) =>
        '<div class="card" style="' + (pop ? 'background:#0f172a;color:#fff;border-color:#0f172a;' : '') + 'padding:32px;text-align:center;"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;' + (pop ? 'color:#a5b4fc;' : 'color:#6366f1;') + 'margin-bottom:8px;">' + name + '</p><p style="font-size:40px;font-weight:900;margin-bottom:16px;' + (pop ? 'color:#fff;' : 'color:#0f172a;') + '">' + price + '</p><p style="margin-bottom:24px;' + (pop ? 'color:#94a3b8;' : '') + '">Per month</p><button class="btn" style="width:100%;' + (pop ? 'background:#fff;color:#0f172a;' : '') + '">Choose</button></div>'
      ).join(''),
      '</div></section>',
    ].join('')),
    code: '// Pricing for ' + title,
  }];
}

function webFooter(title: string): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'Footer – Columns',
    description: 'Multi-column footer with links and copyright.',
    category: 'footer',
    previewHtml: makePreviewHtml([
      '<footer style="padding:64px 32px;border-top:1px solid #e2e8f0;">',
      '<div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;">',
      '<div><p style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;">' + title + '</p><p>Building the future, one pixel at a time.</p></div>',
      ['Product', 'Company', 'Legal'].map((col) =>
        '<div><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">' + col + '</p>' +
        ['Link 1', 'Link 2', 'Link 3'].map((l) =>
          '<p style="margin-bottom:8px;"><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">' + l + '</a></p>'
        ).join('') + '</div>'
      ).join(''),
      '</div>',
      '<div style="max-width:960px;margin:24px auto 0;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">',
      '<p style="font-size:10px;color:#94a3b8;">&copy; 2026 ' + title + '. All rights reserved.</p>',
      '</div></footer>',
    ].join('')),
    code: '// Footer for ' + title,
  }];
}

/* ── Mobile page templates ─────────────────── */

function mobileHome(title: string, desc: string): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'Home Screen',
    description: 'Mobile home screen with search and cards.',
    category: 'hero',
    previewHtml: makePreviewHtml([
      '<div style="padding:16px 20px;">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">',
      '<div><p style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;">Welcome back</p><p style="font-size:20px;font-weight:900;text-transform:uppercase;">' + title + '</p></div>',
      '<div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;">&#10022;</div>',
      '</div>',
      '<div style="padding:12px 16px;border-radius:14px;background:#f1f5f9;margin-bottom:20px;font-size:12px;color:#94a3b8;">🔍 Search...</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
      ['📊 Analytics', '👥 Users', '💰 Revenue', '⚙️ Settings'].map(f => {
        const [icon, name] = f.split(' ');
        return '<div class="card" style="border-radius:16px;padding:16px;text-align:center;"><div style="font-size:24px;margin-bottom:8px;">' + icon + '</div><p style="font-size:11px;font-weight:800;text-transform:uppercase;">' + name + '</p></div>';
      }).join(''),
      '</div></div>',
    ].join(''), true),
    code: '// Mobile home for ' + title,
  }];
}

function mobileList(title: string): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'List View',
    description: 'Scrollable list view with items.',
    category: 'features',
    previewHtml: makePreviewHtml([
      '<div style="padding:16px 20px;">',
      '<p style="font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:16px;">Items</p>',
      Array.from({ length: 5 }, (_, i) =>
        '<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;"><div style="width:40px;height:40px;border-radius:12px;background:#6366f110;display:flex;align-items:center;justify-content:center;color:#6366f1;font-size:16px;">&#10022;</div><div style="flex:1;"><p style="font-size:13px;font-weight:700;">Item ' + (i + 1) + '</p><p style="font-size:11px;color:#94a3b8;">Description for item ' + (i + 1) + '</p></div><span style="font-size:10px;color:#94a3b8;">›</span></div>'
      ).join(''),
      '</div>',
    ].join(''), true),
    code: '// Mobile list for ' + title,
  }];
}

function mobileProfile(title: string): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'Profile Screen',
    description: 'User profile with avatar and settings.',
    category: 'dashboard',
    previewHtml: makePreviewHtml([
      '<div style="padding:24px 20px;text-align:center;">',
      '<div style="width:72px;height:72px;border-radius:24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900;">JD</div>',
      '<p style="font-size:16px;font-weight:900;text-transform:uppercase;">John Doe</p>',
      '<p style="font-size:11px;color:#94a3b8;margin-bottom:24px;">john@example.com</p>',
      ['Account Settings', 'Notifications', 'Privacy', 'Help & Support', 'Log Out'].map(item =>
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:14px;margin-bottom:8px;background:#fff;border:1px solid #e2e8f0;"><span style="font-size:13px;font-weight:600;">' + item + '</span><span style="color:#94a3b8;">›</span></div>'
      ).join(''),
      '</div>',
    ].join(''), true),
    code: '// Mobile profile for ' + title,
  }];
}

function mobileTabBar(): UIVariation[] {
  return [{
    id: `var-${++variationCounter}`,
    label: 'Tab Bar',
    description: 'Bottom navigation tab bar.',
    category: 'footer',
    previewHtml: makePreviewHtml([
      '<div style="position:fixed;bottom:0;left:0;right:0;max-width:390px;margin:0 auto;display:flex;justify-content:space-around;padding:12px 0 20px;border-top:1px solid #e2e8f0;background:#fff;">',
      ['🏠 Home', '🔍 Search', '➕ Create', '💬 Chat', '👤 Profile'].map(t => {
        const [icon, name] = t.split(' ');
        return '<div style="text-align:center;"><div style="font-size:18px;">' + icon + '</div><p style="font-size:8px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-top:2px;">' + name + '</p></div>';
      }).join(''),
      '</div>',
    ].join(''), true),
    code: '// Tab bar',
  }];
}

/* ── Page structures for auto-generation ──── */

export interface PageTemplate {
  role: string;
  label: string;
  getVariations: (title: string, desc: string) => UIVariation[];
}

export const webPages: PageTemplate[] = [
  { role: 'header', label: 'Navbar', getVariations: (t) => webNavbar(t) },
  { role: 'hero', label: 'Hero Section', getVariations: (t, d) => webHero(t, d) },
  { role: 'features', label: 'Features', getVariations: (t) => webFeatures(t) },
  { role: 'pricing', label: 'Pricing', getVariations: (t) => webPricing(t) },
  { role: 'footer', label: 'Footer', getVariations: (t) => webFooter(t) },
];

export const mobilePages: PageTemplate[] = [
  { role: 'home', label: 'Home Screen', getVariations: (t, d) => mobileHome(t, d) },
  { role: 'list', label: 'List View', getVariations: (t) => mobileList(t) },
  { role: 'profile', label: 'Profile', getVariations: (t) => mobileProfile(t) },
  { role: 'tabbar', label: 'Tab Bar', getVariations: () => mobileTabBar() },
];

/** Generate a default variation for each page in the given platform */
export function generatePageNodes(
  title: string,
  description: string,
  platform: 'web' | 'mobile'
): { role: string; label: string; variation: UIVariation }[] {
  const pages = platform === 'web' ? webPages : mobilePages;
  return pages.map((page) => {
    const variations = page.getVariations(title, description);
    return {
      role: page.role,
      label: page.label,
      variation: variations[0],
    };
  });
}

/** Get alternative variations for a specific page role */
export function getAlternativeVariations(
  title: string,
  description: string,
  platform: 'web' | 'mobile',
  role: string
): UIVariation[] {
  const pages = platform === 'web' ? webPages : mobilePages;
  const page = pages.find((p) => p.role === role);
  if (!page) return [];
  return page.getVariations(title, description);
}

// Keep backward compat
export function generateVariations(title: string, description: string): UIVariation[] {
  const desc = description || 'A beautifully crafted solution built with modern design principles.';
  const all: UIVariation[] = [];
  webPages.forEach((p) => all.push(...p.getVariations(title, desc)));
  return all;
}
