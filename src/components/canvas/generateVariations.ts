import { type UIVariation } from '@/stores/canvasStore';

let variationCounter = 0;

function fullPageHtml(sections: string[], isMobile = false): string {
  const mobileStyle = isMobile ? 'max-width:390px;margin:0 auto;' : '';
  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a;' + mobileStyle + ' }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#f1f5f9; } .card { background:#0c0c0e!important; border-color:#1c1c1f!important; } nav,footer,.header { border-color:#1c1c1f!important; } .btn-primary { background:#fff!important; color:#000!important; } }',
    'h1,h2,h3 { font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; }',
    'p { font-size:13px; color:#64748b; line-height:1.8; }',
    '.btn-primary { display:inline-block; padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; transition:opacity .2s; }',
    '.btn-primary:hover { opacity:0.9; }',
    '.btn-outline { display:inline-block; padding:14px 32px; background:transparent; color:#0f172a; border:1px solid #e2e8f0; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }',
    '.card { padding:24px; border-radius:20px; background:#fff; border:1px solid #e2e8f0; }',
    '</style></head><body>',
    ...sections,
    '</body></html>',
  ].join('\n');
}

/* ═══════════════════════════════════════════════════
   FULL PAGE VARIATIONS — WEB
   ═══════════════════════════════════════════════════ */

function webLandingVariation1(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Style A',
    description: 'Minimal & clean landing page with centered hero, 3-col features, pricing tiers, and column footer.',
    category: 'hero',
    previewHtml: fullPageHtml([
      // Navbar
      '<nav style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">',
      '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;">&#10022;</div>',
      '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
      '<div style="display:flex;gap:24px;margin-left:auto;"><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Home</a><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Features</a><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Pricing</a></div></nav>',
      // Hero centered
      '<section style="text-align:center;padding:100px 32px;">',
      '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">Welcome to</p>',
      '<h1 style="font-size:44px;margin-bottom:16px;">' + title + '</h1>',
      '<p style="max-width:520px;margin:0 auto 32px;">' + desc + '</p>',
      '<div style="display:flex;gap:12px;justify-content:center;"><button class="btn-primary">Get Started</button><button class="btn-outline">Learn More</button></div></section>',
      // Features 3-col
      '<section style="padding:80px 32px;"><div style="max-width:960px;margin:0 auto;">',
      '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">Features</h2>',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">',
      ...['⚡ Performance', '🔒 Security', '📱 Responsive', '🎨 Design', '🚀 Deploy', '💡 Smart'].map(f => { const [i, n] = f.split(' '); return '<div class="card"><div style="font-size:24px;margin-bottom:12px;">' + i + '</div><h3 style="font-size:14px;margin-bottom:8px;">' + n + '</h3><p>Built for modern workflows with best-in-class tooling and performance.</p></div>'; }),
      '</div></div></section>',
      // Pricing
      '<section style="padding:80px 32px;text-align:center;background:#f1f5f9;">',
      '<h2 style="font-size:28px;margin-bottom:48px;">Pricing</h2>',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px;margin:0 auto;">',
      ...([['Starter', '$9'], ['Pro', '$29'], ['Enterprise', '$99']] as const).map(([name, price], i) =>
        '<div class="card" style="' + (i === 1 ? 'background:#0f172a;color:#fff;border-color:#0f172a;' : '') + 'padding:32px;text-align:center;"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;' + (i === 1 ? 'color:#a5b4fc;' : 'color:#6366f1;') + 'margin-bottom:8px;">' + name + '</p><p style="font-size:40px;font-weight:900;margin-bottom:16px;' + (i === 1 ? 'color:#fff;' : 'color:#0f172a;') + '">' + price + '</p><p style="margin-bottom:24px;' + (i === 1 ? 'color:#94a3b8;' : '') + '">Per month</p><button class="btn-primary" style="width:100%;' + (i === 1 ? 'background:#fff;color:#0f172a;' : '') + '">Choose</button></div>'
      ),
      '</div></section>',
      // Footer
      '<footer style="padding:48px 32px;border-top:1px solid #e2e8f0;text-align:center;">',
      '<p style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">&copy; 2026 ' + title + '. All rights reserved.</p></footer>',
    ]),
    code: '// Landing page variation A for ' + title,
  };
}

function webLandingVariation2(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Style B',
    description: 'Bold split-hero landing page with bento features grid, testimonials, and dark CTA section.',
    category: 'hero',
    previewHtml: fullPageHtml([
      // Navbar dark
      '<nav style="padding:20px 40px;display:flex;align-items:center;justify-content:space-between;">',
      '<div style="display:flex;align-items:center;gap:10px;"><div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;">&#10022;</div>',
      '<span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">' + title + '</span></div>',
      '<div style="display:flex;gap:20px;align-items:center;"><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">About</a><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Features</a><button class="btn-primary" style="padding:10px 24px;">Sign Up</button></div></nav>',
      // Hero split
      '<section style="display:flex;align-items:center;gap:48px;padding:80px 48px;min-height:480px;">',
      '<div style="flex:1;"><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#ec4899;margin-bottom:16px;">✦ New Release</p>',
      '<h1 style="font-size:42px;line-height:1.1;margin-bottom:20px;">' + title + '</h1>',
      '<p style="margin-bottom:28px;max-width:420px;">' + desc + '</p>',
      '<div style="display:flex;gap:12px;"><button class="btn-primary">Start Free Trial</button><button class="btn-outline">Watch Demo</button></div></div>',
      '<div style="flex:1;height:360px;border-radius:24px;background:linear-gradient(135deg,#6366f115,#ec489915);border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;">',
      '<div style="text-align:center;"><span style="font-size:72px;opacity:0.15;">&#10022;</span><p style="font-size:10px;font-weight:900;text-transform:uppercase;color:#94a3b8;margin-top:12px;">App Preview</p></div></div></section>',
      // Bento features
      '<section style="padding:80px 32px;"><div style="max-width:960px;margin:0 auto;">',
      '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">Everything You Need</h2>',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto auto;gap:16px;">',
      '<div class="card" style="grid-column:span 2;display:flex;align-items:center;padding:32px;gap:24px;"><div style="font-size:40px;">⚡</div><div><h3 style="font-size:18px;margin-bottom:8px;">Blazing Fast</h3><p>Optimized for speed at every layer of the stack.</p></div></div>',
      '<div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;"><div style="font-size:36px;margin-bottom:8px;">🔒</div><h3 style="font-size:14px;">Secure</h3></div>',
      '<div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;"><div style="font-size:36px;margin-bottom:8px;">📊</div><h3 style="font-size:14px;">Analytics</h3></div>',
      '<div class="card" style="grid-column:span 2;display:flex;align-items:center;padding:32px;gap:24px;"><div style="font-size:40px;">🚀</div><div><h3 style="font-size:18px;margin-bottom:8px;">Scale Infinitely</h3><p>From zero to millions of users without breaking a sweat.</p></div></div>',
      '</div></div></section>',
      // CTA
      '<section style="padding:80px 32px;background:#0f172a;text-align:center;">',
      '<h2 style="font-size:32px;color:#fff;margin-bottom:16px;">Ready to Get Started?</h2>',
      '<p style="color:#94a3b8;max-width:480px;margin:0 auto 32px;">Join thousands of teams building better products with ' + title + '.</p>',
      '<button class="btn-primary" style="background:#fff;color:#0f172a;">Start Free Trial</button></section>',
      // Footer
      '<footer style="padding:48px 32px;border-top:1px solid #e2e8f0;">',
      '<div style="max-width:960px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;">',
      '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>',
      '<p style="font-size:10px;color:#94a3b8;">&copy; 2026. All rights reserved.</p></div></footer>',
    ]),
    code: '// Landing page variation B for ' + title,
  };
}

function webLandingVariation3(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Style C',
    description: 'Gradient hero landing page with icon feature list, stats counter, and newsletter CTA.',
    category: 'hero',
    previewHtml: fullPageHtml([
      // Navbar with CTA
      '<nav style="padding:16px 32px;display:flex;align-items:center;justify-content:space-between;">',
      '<div style="display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;">&#10022;</div>',
      '<span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">' + title + '</span></div>',
      '<div style="display:flex;gap:20px;align-items:center;"><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Home</a><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Pricing</a><a href="#" style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;text-decoration:none;">Docs</a><button class="btn-primary" style="padding:10px 20px;border-radius:8px;background:linear-gradient(135deg,#06b6d4,#6366f1);">Get Started</button></div></nav>',
      // Gradient hero
      '<section style="padding:100px 32px;text-align:center;background:linear-gradient(180deg,#f8fafc 0%,#ede9fe 100%);">',
      '<div style="display:inline-block;padding:6px 16px;border-radius:20px;background:#6366f115;border:1px solid #6366f130;margin-bottom:20px;"><span style="font-size:10px;font-weight:900;text-transform:uppercase;color:#6366f1;">🎉 Now in Beta</span></div>',
      '<h1 style="font-size:48px;line-height:1.1;margin-bottom:20px;max-width:700px;margin-left:auto;margin-right:auto;">' + title + '</h1>',
      '<p style="max-width:520px;margin:0 auto 36px;font-size:14px;">' + desc + '</p>',
      '<div style="display:flex;gap:12px;justify-content:center;"><button class="btn-primary" style="background:linear-gradient(135deg,#06b6d4,#6366f1);">Start Building</button><button class="btn-outline">View Docs</button></div></section>',
      // Stats
      '<section style="padding:48px 32px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">',
      '<div style="max-width:800px;margin:0 auto;display:flex;justify-content:space-around;text-align:center;">',
      ...([['10K+', 'Users'], ['99.9%', 'Uptime'], ['50+', 'Integrations'], ['24/7', 'Support']] as const).map(([val, label]) =>
        '<div><p style="font-size:32px;font-weight:900;color:#0f172a;">' + val + '</p><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-top:4px;">' + label + '</p></div>'
      ),
      '</div></section>',
      // Feature list
      '<section style="padding:80px 32px;"><div style="max-width:640px;margin:0 auto;">',
      '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">Why Choose Us</h2>',
      ...['⚡ Lightning Fast — Optimized for speed at every layer.', '🔒 Secure by Default — Enterprise-grade encryption built in.', '📱 Mobile First — Perfect on any device, any screen.', '🎨 Beautiful UI — Designed to delight your users.'].map(f => {
        const [icon, rest] = [f.slice(0, 2), f.slice(3)];
        const [name, desc2] = rest.split(' — ');
        return '<div style="display:flex;gap:16px;align-items:start;padding:20px 0;border-bottom:1px solid #e2e8f0;"><div style="width:44px;height:44px;border-radius:12px;background:#6366f110;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">' + icon + '</div><div><h3 style="font-size:14px;font-weight:900;margin-bottom:4px;">' + name + '</h3><p>' + desc2 + '</p></div></div>';
      }),
      '</div></section>',
      // CTA newsletter
      '<section style="padding:80px 32px;text-align:center;background:linear-gradient(180deg,#ede9fe,#f8fafc);">',
      '<h2 style="font-size:28px;margin-bottom:12px;">Stay Updated</h2>',
      '<p style="max-width:400px;margin:0 auto 24px;">Get the latest updates and features delivered to your inbox.</p>',
      '<div style="display:flex;gap:8px;justify-content:center;max-width:400px;margin:0 auto;">',
      '<input type="email" placeholder="Enter your email" style="flex:1;padding:14px 16px;border:1px solid #e2e8f0;border-radius:12px;font-size:12px;outline:none;" />',
      '<button class="btn-primary" style="background:linear-gradient(135deg,#06b6d4,#6366f1);">Subscribe</button></div></section>',
      // Footer
      '<footer style="padding:48px 32px;border-top:1px solid #e2e8f0;text-align:center;">',
      '<p style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">&copy; 2026 ' + title + '. All rights reserved.</p></footer>',
    ]),
    code: '// Landing page variation C for ' + title,
  };
}

/* ═══════════════════════════════════════════════════
   FULL PAGE VARIATIONS — MOBILE
   ═══════════════════════════════════════════════════ */

function mobileLandingVariation1(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Mobile A',
    description: 'Mobile-first app with home, cards, and bottom tab bar.',
    category: 'mobile',
    previewHtml: fullPageHtml([
      '<div style="min-height:100vh;display:flex;flex-direction:column;">',
      // Status bar
      '<div style="padding:12px 20px;display:flex;justify-content:space-between;font-size:10px;font-weight:700;"><span>9:41</span><span>···</span></div>',
      // Header
      '<div style="padding:0 20px 16px;"><h1 style="font-size:24px;margin-bottom:4px;">' + title + '</h1><p>' + desc + '</p></div>',
      // Search
      '<div style="padding:0 20px 16px;"><div style="padding:12px 16px;border-radius:14px;background:#f1f5f9;font-size:12px;color:#94a3b8;">🔍 Search...</div></div>',
      // Cards
      '<div style="flex:1;padding:0 20px;overflow:auto;">',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">',
      ...['📊 Analytics', '👥 Users', '💰 Revenue', '⚙️ Settings'].map(f => { const [i, n] = f.split(' '); return '<div class="card" style="border-radius:16px;padding:16px;text-align:center;"><div style="font-size:28px;margin-bottom:8px;">' + i + '</div><p style="font-size:11px;font-weight:800;text-transform:uppercase;">' + n + '</p></div>'; }),
      '</div>',
      // List items
      ...['Recent Activity', 'Notifications', 'Messages'].map(item =>
        '<div style="display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;margin-bottom:8px;"><div style="width:36px;height:36px;border-radius:10px;background:#6366f110;display:flex;align-items:center;justify-content:center;color:#6366f1;">&#10022;</div><div style="flex:1;"><p style="font-size:13px;font-weight:700;">' + item + '</p><p style="font-size:10px;color:#94a3b8;">Tap to view details</p></div><span style="color:#94a3b8;">›</span></div>'
      ),
      '</div>',
      // Tab bar
      '<div style="display:flex;justify-content:space-around;padding:12px 0 24px;border-top:1px solid #e2e8f0;background:#fff;">',
      ...['🏠 Home', '🔍 Search', '➕ Add', '💬 Chat', '👤 Profile'].map(t => { const [i, n] = t.split(' '); return '<div style="text-align:center;"><div style="font-size:18px;">' + i + '</div><p style="font-size:8px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-top:2px;">' + n + '</p></div>'; }),
      '</div></div>',
    ], true),
    code: '// Mobile app variation A for ' + title,
  };
}

function mobileLandingVariation2(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Mobile B',
    description: 'Modern mobile app with profile header, stats, and action list.',
    category: 'mobile',
    previewHtml: fullPageHtml([
      '<div style="min-height:100vh;display:flex;flex-direction:column;">',
      '<div style="padding:12px 20px;display:flex;justify-content:space-between;font-size:10px;font-weight:700;"><span>9:41</span><span>···</span></div>',
      // Profile header
      '<div style="padding:20px;text-align:center;">',
      '<div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:900;">JD</div>',
      '<h2 style="font-size:18px;margin-bottom:2px;">' + title + '</h2>',
      '<p style="font-size:11px;color:#94a3b8;">Welcome back, John</p></div>',
      // Stats
      '<div style="display:flex;gap:12px;padding:0 20px 20px;">',
      ...([['128', 'Tasks'], ['92%', 'Done'], ['12', 'Pending']] as const).map(([v, l]) =>
        '<div class="card" style="flex:1;border-radius:16px;padding:16px;text-align:center;"><p style="font-size:22px;font-weight:900;">' + v + '</p><p style="font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;">' + l + '</p></div>'
      ),
      '</div>',
      // Actions
      '<div style="flex:1;padding:0 20px;">',
      '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Quick Actions</p>',
      ...['📝 New Task', '📅 Calendar', '📊 Reports', '⚙️ Settings', '❓ Help Center'].map(item => {
        const [icon, name] = item.split(' ');
        return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;margin-bottom:8px;"><span style="font-size:18px;">' + icon + '</span><span style="font-size:13px;font-weight:600;flex:1;">' + name + '</span><span style="color:#94a3b8;">›</span></div>';
      }),
      '</div>',
      // Tab bar
      '<div style="display:flex;justify-content:space-around;padding:12px 0 24px;border-top:1px solid #e2e8f0;background:#fff;">',
      ...['🏠 Home', '📋 Tasks', '📊 Stats', '👤 Me'].map(t => { const [i, n] = t.split(' '); return '<div style="text-align:center;"><div style="font-size:18px;">' + i + '</div><p style="font-size:8px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-top:2px;">' + n + '</p></div>'; }),
      '</div></div>',
    ], true),
    code: '// Mobile app variation B for ' + title,
  };
}

function mobileLandingVariation3(title: string, desc: string): UIVariation {
  return {
    id: `var-${++variationCounter}`,
    label: title + ' — Mobile C',
    description: 'E-commerce style mobile app with product grid and shopping cart.',
    category: 'mobile',
    previewHtml: fullPageHtml([
      '<div style="min-height:100vh;display:flex;flex-direction:column;">',
      '<div style="padding:12px 20px;display:flex;justify-content:space-between;font-size:10px;font-weight:700;"><span>9:41</span><span>···</span></div>',
      // Header
      '<div style="padding:4px 20px 16px;display:flex;align-items:center;justify-content:space-between;">',
      '<h1 style="font-size:22px;">' + title + '</h1>',
      '<div style="width:36px;height:36px;border-radius:12px;background:#6366f110;display:flex;align-items:center;justify-content:center;position:relative;">🛒<div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#ef4444;color:#fff;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;">3</div></div></div>',
      // Banner
      '<div style="margin:0 20px 16px;padding:24px;border-radius:20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;">',
      '<p style="font-size:9px;font-weight:700;text-transform:uppercase;color:#c7d2fe;">Special Offer</p>',
      '<p style="font-size:20px;font-weight:900;margin:4px 0;">50% OFF</p>',
      '<p style="font-size:11px;color:#c7d2fe;">On your first order</p></div>',
      // Product grid
      '<div style="flex:1;padding:0 20px;">',
      '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Popular</p>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
      ...(['Product A $29', 'Product B $49', 'Product C $19', 'Product D $39'] as const).map(p => {
        const [name, price] = [p.split(' $')[0], '$' + p.split(' $')[1]];
        return '<div class="card" style="border-radius:16px;padding:0;overflow:hidden;"><div style="height:100px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:32px;opacity:0.3;">&#10022;</div><div style="padding:12px;"><p style="font-size:12px;font-weight:700;">' + name + '</p><p style="font-size:14px;font-weight:900;color:#6366f1;">' + price + '</p></div></div>';
      }),
      '</div></div>',
      // Tab bar
      '<div style="display:flex;justify-content:space-around;padding:12px 0 24px;border-top:1px solid #e2e8f0;background:#fff;">',
      ...['🏠 Home', '🔍 Browse', '🛒 Cart', '❤️ Saved', '👤 Account'].map(t => { const [i, n] = t.split(' '); return '<div style="text-align:center;"><div style="font-size:18px;">' + i + '</div><p style="font-size:8px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-top:2px;">' + n + '</p></div>'; }),
      '</div></div>',
    ], true),
    code: '// Mobile e-commerce variation C for ' + title,
  };
}

/* ═══════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════ */

/** Generate full-page variations for the given platform */
export function generateFullPageVariations(
  title: string,
  description: string,
  platform: 'web' | 'mobile'
): UIVariation[] {
  const desc = description || 'A beautifully crafted solution built with modern design principles.';
  if (platform === 'web') {
    return [
      webLandingVariation1(title, desc),
      webLandingVariation2(title, desc),
      webLandingVariation3(title, desc),
    ];
  }
  return [
    mobileLandingVariation1(title, desc),
    mobileLandingVariation2(title, desc),
    mobileLandingVariation3(title, desc),
  ];
}

/** Get a random different variation for regeneration */
export function getRandomVariation(
  title: string,
  description: string,
  platform: 'web' | 'mobile',
  excludeId?: string
): UIVariation {
  const all = generateFullPageVariations(title, description, platform);
  const filtered = excludeId ? all.filter(v => v.id !== excludeId) : all;
  return filtered[Math.floor(Math.random() * filtered.length)] || all[0];
}

/* ═══════════════════════════════════════════════════
   SUB-UI SECTION GENERATION
   ═══════════════════════════════════════════════════ */

interface SubSection {
  id: string;
  label: string;
  description: string;
  category: 'header' | 'hero' | 'features' | 'pricing' | 'footer' | 'dashboard' | 'mobile';
  previewHtml: string;
  code: string;
}

function sectionHtml(content: string): string {
  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<style>',
    '* { margin:0; padding:0; box-sizing:border-box; }',
    'body { font-family: system-ui, -apple-system, sans-serif; background:#f8fafc; color:#0f172a; }',
    '@media (prefers-color-scheme:dark) { body { background:#050505; color:#f1f5f9; } .card { background:#0c0c0e!important; border-color:#1c1c1f!important; } }',
    'h1,h2,h3 { font-weight:900; text-transform:uppercase; letter-spacing:-0.02em; }',
    'p { font-size:13px; color:#64748b; line-height:1.8; }',
    '.btn-primary { display:inline-block; padding:14px 32px; background:#0f172a; color:#fff; border:none; border-radius:12px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer; }',
    '.card { padding:24px; border-radius:20px; background:#fff; border:1px solid #e2e8f0; }',
    '</style></head><body>',
    content,
    '</body></html>',
  ].join('\n');
}

export function generateSubSections(title: string, platform: 'web' | 'mobile'): SubSection[] {
  const sections: SubSection[] = [
    {
      id: `sub-${++variationCounter}`,
      label: 'Header / Navbar',
      description: 'Navigation bar with logo, links, and CTA button.',
      category: 'header',
      previewHtml: sectionHtml(
        '<nav style="padding:16px 32px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:12px;">' +
        '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:12px;">&#10022;</div>' +
        '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">' + title + '</span>' +
        '<div style="display:flex;gap:24px;margin-left:auto;"><a href="#" style="font-size:10px;font-weight:700;color:#64748b;text-decoration:none;">Home</a><a href="#" style="font-size:10px;font-weight:700;color:#64748b;text-decoration:none;">Features</a><a href="#" style="font-size:10px;font-weight:700;color:#64748b;text-decoration:none;">Pricing</a></div>' +
        '<button class="btn-primary" style="padding:10px 24px;margin-left:16px;">Sign Up</button></nav>'
      ),
      code: '<!-- Header Component -->',
    },
    {
      id: `sub-${++variationCounter}`,
      label: 'Hero Section',
      description: 'Large hero with headline, subtitle and CTA buttons.',
      category: 'hero',
      previewHtml: sectionHtml(
        '<section style="text-align:center;padding:100px 32px;">' +
        '<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">Welcome</p>' +
        '<h1 style="font-size:44px;margin-bottom:16px;">' + title + '</h1>' +
        '<p style="max-width:520px;margin:0 auto 32px;">Build something extraordinary with modern tools and beautiful design.</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;"><button class="btn-primary">Get Started</button><button style="padding:14px 32px;border:1px solid #e2e8f0;border-radius:12px;background:transparent;font-size:10px;font-weight:900;text-transform:uppercase;cursor:pointer;">Learn More</button></div></section>'
      ),
      code: '<!-- Hero Component -->',
    },
    {
      id: `sub-${++variationCounter}`,
      label: 'Features Grid',
      description: 'Grid of feature cards with icons and descriptions.',
      category: 'features',
      previewHtml: sectionHtml(
        '<section style="padding:80px 32px;"><div style="max-width:960px;margin:0 auto;">' +
        '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">Features</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">' +
        ['Performance', 'Security', 'Scalability'].map(f =>
          '<div class="card"><div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);margin-bottom:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;">✦</div>' +
          '<h3 style="font-size:14px;margin-bottom:8px;">' + f + '</h3>' +
          '<p>Built with the latest technology for maximum efficiency and reliability.</p></div>'
        ).join('') +
        '</div></div></section>'
      ),
      code: '<!-- Features Component -->',
    },
    {
      id: `sub-${++variationCounter}`,
      label: 'Pricing Table',
      description: 'Pricing tiers with feature lists and CTA.',
      category: 'pricing',
      previewHtml: sectionHtml(
        '<section style="padding:80px 32px;background:#f1f5f9;"><div style="max-width:960px;margin:0 auto;">' +
        '<h2 style="font-size:28px;text-align:center;margin-bottom:48px;">Pricing</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">' +
        [{ name: 'Starter', price: '$9' }, { name: 'Pro', price: '$29' }, { name: 'Enterprise', price: '$99' }].map((p, i) =>
          '<div class="card" style="text-align:center;' + (i === 1 ? 'border-color:#6366f1;' : '') + '">' +
          '<h3 style="font-size:14px;margin-bottom:8px;">' + p.name + '</h3>' +
          '<p style="font-size:32px;font-weight:900;color:#0f172a;margin-bottom:16px;">' + p.price + '<span style="font-size:12px;color:#64748b;">/mo</span></p>' +
          '<ul style="list-style:none;margin-bottom:24px;text-align:left;">' +
          '<li style="padding:6px 0;font-size:12px;color:#64748b;">✓ Feature one</li>' +
          '<li style="padding:6px 0;font-size:12px;color:#64748b;">✓ Feature two</li></ul>' +
          '<button class="btn-primary" style="width:100%;">Choose Plan</button></div>'
        ).join('') +
        '</div></div></section>'
      ),
      code: '<!-- Pricing Component -->',
    },
    {
      id: `sub-${++variationCounter}`,
      label: 'Footer',
      description: 'Footer with links, social icons, and copyright.',
      category: 'footer',
      previewHtml: sectionHtml(
        '<footer style="padding:48px 32px;border-top:1px solid #e2e8f0;">' +
        '<div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;">' +
        '<div><h3 style="font-size:14px;margin-bottom:12px;">' + title + '</h3><p>Building the future, one pixel at a time.</p></div>' +
        '<div><h3 style="font-size:11px;margin-bottom:12px;">Product</h3><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">Features</a></p><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">Pricing</a></p></div>' +
        '<div><h3 style="font-size:11px;margin-bottom:12px;">Company</h3><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">About</a></p><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">Blog</a></p></div>' +
        '<div><h3 style="font-size:11px;margin-bottom:12px;">Legal</h3><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">Privacy</a></p><p><a href="#" style="color:#64748b;text-decoration:none;font-size:12px;">Terms</a></p></div>' +
        '</div><p style="text-align:center;margin-top:32px;font-size:11px;">© 2026 ' + title + '. All rights reserved.</p></footer>'
      ),
      code: '<!-- Footer Component -->',
    },
  ];

  return sections;
}
