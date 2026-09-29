// Deterministic release metadata and versioned static assets. Set SITE_URL for a custom domain.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const version = '78';
const origin = new URL(process.env.SITE_URL || 'https://sydney-course-finder.vercel.app').origin;
const canonicalRoutes = { index: '/', calculator: '/atar-calculator', subjects: '/subject-helper', 'no-atar': '/pathways', 'atar-compass': '/advisor' };
for (const [slug, title, description] of [
 ['universities', 'Universities | Sydney Course Finder', 'Browse Sydney universities and providers, their courses and official entry information.'],
 ['library', 'Course Library | Sydney Course Finder', 'Review saved courses and compare entry ranks, course structure, fees and study options.']
]) {
 const shell = fs.readFileSync(path.join(root,'index.html'),'utf8')
   .replace(/<title>[^<]+<\/title>/, `<title>${title}</title>`)
   .replace(/name="description"\s+content="[^"]+"/, `name="description" content="${description}"`);
 fs.writeFileSync(path.join(root,slug+'.html'),shell);
}
const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for (const name of pages) {
 const file = path.join(root,name);
 let html = fs.readFileSync(file,'utf8');
 html = html.replace(/asset-refresh-v\d+\.js/g, `asset-refresh-v${version}.js`);
 const slug = name.replace(/\.html$/,'');
 const url = origin + (canonicalRoutes[slug] || '/'+slug);
 const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || 'Sydney Course Finder';
 const description = html.match(/name="description"\s+content="([^"]+)"/)?.[1] || title;
 html = html.replace(/\s*<!-- release metadata -->[\s\S]*?<!-- end release metadata -->/g,'');
 const data = { '@context':'https://schema.org', '@type':slug==='index'?'WebSite':'WebPage', name:title, description, url, inLanguage:'en-AU' };
 const metadata = `\n    <!-- release metadata -->\n    <link rel="canonical" href="${url}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:site_name" content="Sydney Course Finder" />\n    <meta property="og:title" content="${escape(title)}" />\n    <meta property="og:description" content="${escape(description)}" />\n    <meta property="og:url" content="${url}" />\n    <meta property="og:image" content="${origin}/assets/app-icon-512.png" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:title" content="${escape(title)}" />\n    <meta name="twitter:description" content="${escape(description)}" />\n    <meta name="twitter:image" content="${origin}/assets/app-icon-512.png" />\n    <script type="application/ld+json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script>\n    <!-- end release metadata -->\n`;
 html = html.replace('</head>',metadata+'  </head>');
 html = html.replace(/((?:src|href)="\.\/[^"?]+\.(?:js|css))(?:\?v=[^"&]+)?"/g, `$1?v=${version}"`);
 html = html.replace(/[\t ]+$/gm, '');
 fs.writeFileSync(file,html);
}
const swPath = path.join(root, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8')
 .replace(/sydney-course-finder-app-v\d+/g, `sydney-course-finder-app-v${version}`)
 .replace(/asset-refresh-v\d+\.js/g, `asset-refresh-v${version}.js`));
const packagePath = path.join(root, 'package.json');
fs.writeFileSync(packagePath, fs.readFileSync(packagePath, 'utf8').replace(/asset-refresh-v\d+\.js/g, `asset-refresh-v${version}.js`));
const routes = [...new Set(pages.map(name=>canonicalRoutes[name.replace(/\.html$/,'')] || '/'+name.replace(/\.html$/,'')))];
fs.writeFileSync(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${origin}${route}</loc></url>`).join('\n')}\n</urlset>\n`);
const configPath = path.join(root,'vercel.json');
const config = JSON.parse(fs.readFileSync(configPath,'utf8'));
for (const slug of ['universities','library']) {
 if (!config.rewrites.some(rule=>rule.source==='/'+slug)) config.rewrites.push({source:'/'+slug,destination:'/'+slug+'.html'});
}
const headers = require('../security-headers');
config.headers = [
 {source:'/(.*)', headers:Object.entries(headers).map(([key,value])=>({key,value}))},
 {source:'/(.*)\\.(js|mjs|css)', has:[{type:'query',key:'v',value:'[0-9]+'}], headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
 {source:'/course-data/details/(.*)', headers:[{key:'Cache-Control',value:'public, max-age=3600, stale-while-revalidate=86400'}]},
 {source:'/sw.js', headers:[{key:'Cache-Control',value:'no-cache'}]}
];
fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
console.log(`Release ${version}: metadata for ${pages.length} pages; ${routes.length} canonical routes; deployment headers updated.`);
