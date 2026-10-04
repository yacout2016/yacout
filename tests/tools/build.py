# -*- coding: utf-8 -*-
import json, html, sys
sys.path.insert(0, sys.argv[1]); from pages import PAGES, HUB, SITE, REG
OUT = sys.argv[2]; DATE = '2026-10-04'
e = lambda s: html.escape(s, quote=True)
def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace('</', '<\\/') + '</script>'
def head(title, desc, url, extra=''):
    return f'''<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{url}"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="article"><meta property="og:site_name" content="GRIFFINE"><meta property="og:locale" content="ar_AR"><meta property="og:url" content="{url}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{SITE}/icon-512.png">
<meta name="twitter:card" content="summary"><meta name="copyright" content="© GRIFFINE — جميع الحقوق محفوظة">
<link rel="stylesheet" href="guide.css?v=158">{extra}</head><body>
<header class="g-top"><a class="g-brand" href="./"><img src="griffine-logo-light.webp" class="g-lt" alt="GRIFFINE" width="44" height="38"><img src="griffine-logo-dark.webp" class="g-dk" alt="" width="44" height="38"><span>GRIFFINE <small>جريفين</small></span></a>
<nav><a href="guide.html">الدليل</a><a class="g-btn" href="{REG}">ابدأ مجانًا</a></nav></header><main class="g-main">'''
FOOT = f'''</main><footer class="g-foot"><nav>{''.join(f'<a href="{p["slug"]}.html">{e(p["h1"].split(":")[0].split("(")[0].strip())}</a>' for p in PAGES)}</nav>
<p>⚠️ المحتوى تعليمي واسترشادي ومش توصية بالشراء أو البيع. الاستثمار في الأسهم فيه مخاطر، والقرار قرارك.</p>
<p>© GRIFFINE جريفين — <a href="{SITE}/">www.griffine.app</a> · <a href="index.php?page=privacy">الخصوصية</a> · <a href="index.php?page=terms">الشروط والأحكام</a> · info@griffine.app</p></footer></body></html>
'''
def cta(t='جرّبها بنفسك على جريفين'): return f'<div class="g-cta"><b>{e(t)}</b><span>خطط DCA وGrid، تنبيهات، توصيات وتحليلات — بالعربي وعلى الموبايل.</span><a class="g-btn" href="{REG}">ابدأ مجانًا</a></div>'
for p in PAGES:
    url = f'{SITE}/{p["slug"]}.html'
    lds = ld({'@context': 'https://schema.org', '@graph': [
        {'@type': 'Article', 'headline': p['h1'], 'description': p['desc'], 'inLanguage': 'ar', 'datePublished': DATE, 'dateModified': DATE, 'mainEntityOfPage': url, 'keywords': p['kw'],
         'image': SITE + '/icon-512.png', 'author': {'@type': 'Organization', 'name': 'GRIFFINE', 'url': SITE + '/'}, 'publisher': {'@type': 'Organization', 'name': 'GRIFFINE', 'alternateName': 'جريفين', 'logo': {'@type': 'ImageObject', 'url': SITE + '/icon-512.png'}}},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in p['faq']]},
        {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'جريفين', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'الدليل', 'item': SITE + '/guide.html'}, {'@type': 'ListItem', 'position': 3, 'name': p['h1'], 'item': url}]}]})
    body = f'<nav class="g-bc"><a href="./">جريفين</a> › <a href="guide.html">الدليل</a> › <span>{e(p["h1"])}</span></nav><article><h1>{e(p["h1"])}</h1><p class="g-lead">{e(p["intro"])}</p>'
    for i, (h, items) in enumerate(p['sections']):
        body += f'<h2>{e(h)}</h2>' + ('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in items) + '</ul>' if len(items) > 1 else f'<p>{e(items[0])}</p>')
        if i == 1: body += cta()
    body += '<h2>أسئلة شائعة</h2>' + ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in p['faq'])
    body += cta('ابدأ خطتك دلوقتي') + '<h2>اقرأ كمان</h2><ul class="g-rel">' + ''.join(f'<li><a href="{o["slug"]}.html">{e(o["h1"])}</a></li>' for o in PAGES if o is not p) + '</ul></article>'
    open(f'{OUT}/{p["slug"]}.html', 'w').write(head(p['title'], p['desc'], url, lds) + body + FOOT)
url = f'{SITE}/guide.html'
hub = f'<article><h1>{e(HUB["h1"])}</h1><p class="g-lead">كل اللي محتاج تعرفه عشان تستثمر في الأسهم بخطة واضحة: استراتيجيات الشراء والبيع، المؤشرات الفنية، تنويع المحفظة، والتنبيهات — مشروحة ببساطة، ومعاها إزاي تطبقها على منصة جريفين GRIFFINE.</p><div class="g-cards">'
hub += ''.join(f'<a class="g-card" href="{p["slug"]}.html"><b>{e(p["h1"])}</b><span>{e(p["desc"][:120])}…</span></a>' for p in PAGES) + '</div>' + cta() + '</article>'
lds = ld({'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': HUB['h1'], 'description': HUB['desc'], 'url': url, 'inLanguage': 'ar',
          'hasPart': [{'@type': 'Article', 'headline': p['h1'], 'url': f'{SITE}/{p["slug"]}.html'} for p in PAGES]})
open(f'{OUT}/guide.html', 'w').write(head(HUB['title'], HUB['desc'], url, lds) + hub + FOOT)
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sm += f'  <url><loc>{SITE}/</loc><lastmod>{DATE}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n'
sm += f'  <url><loc>{SITE}/guide.html</loc><lastmod>{DATE}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n'
sm += ''.join(f'  <url><loc>{SITE}/{p["slug"]}.html</loc><lastmod>{DATE}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n' for p in PAGES)
open(f'{OUT}/sitemap.xml', 'w').write(sm + '</urlset>\n')
print(len(PAGES) + 1, 'pages')
