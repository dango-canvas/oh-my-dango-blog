const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const toml = require('@iarna/toml');
const ejs = require('ejs');
const RSS = require('rss');
const { SitemapStream, streamToPromise } = require('sitemap');

// 配置 marked 以保留数学公式
marked.use({
    extensions: [
        {
            name: 'blockMath',
            level: 'block',
            start(src) { return src.indexOf('$$'); },
            tokenizer(src, tokens) {
                const match = /^\$\$([\s\S]+?)\$\$/.exec(src);
                if (match) {
                    return {
                        type: 'blockMath',
                        raw: match[0],
                        text: match[0]
                    };
                }
            },
            renderer(token) {
                return `<p>${token.text}</p>`;
            }
        },
        {
            name: 'inlineMath',
            level: 'inline',
            start(src) { return src.indexOf('$'); },
            tokenizer(src, tokens) {
                const match = /^\$([^\$\n]+?)\$/.exec(src);
                if (match) {
                    return {
                        type: 'inlineMath',
                        raw: match[0],
                        text: match[0]
                    };
                }
            },
            renderer(token) {
                return token.text;
            }
        }
    ]
});

// --- 路径定义 ---
const contentDir = path.join(__dirname, 'content');
const legalDir = path.join(contentDir, 'legal');
const publicDir = path.join(__dirname, 'public');
const templatesDir = path.join(__dirname, 'templates');
const metadataPath = path.join(__dirname, 'metadata.toml');

// --- 辅助函数 ---

function slugify(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
        .replace(/\./g, '-') // <--- 新增：将点替换为横杠
        .replace(/\s+/g, '-')
        .replace(/[^\u4e00-\u9fa5a-z0-9-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
}

function parseTagsAndContent(fileContent) {
    const lines = fileContent.split('\n');
    const firstLine = lines[0] || '';
    
    // 使用新的正则表达式
    const tags = (firstLine.match(/#[^\s#]+/g) || []).map(tag => tag.substring(1));
    
    const content = firstLine.trim().startsWith('#') 
        ? lines.slice(1).join('\n') 
        : fileContent;

    return { tags, content };
}


// --- 构建主流程 ---

async function build() {
    console.log('开始构建...');

    // 1. 清理并准备目录
    await fs.emptyDir(publicDir);
    
    const staticDir = path.join(__dirname, 'static');
    if (await fs.pathExists(staticDir)) {
        await fs.copy(staticDir, publicDir);
    }
    
    // 2. 读取并解析元数据
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = toml.parse(metadataContent);

    // 读取站点配置
    const siteConfig = metadata.site;
    if (!siteConfig || !siteConfig.baseURL) {
        console.error('错误: metadata.toml 中必须包含 [site] 配置和 baseURL 字段。');
        process.exit(1);
    }

    const allPosts = [];
    const posts = metadata.post || [];
    for (const meta of posts) {
        const filename = meta.file;
        if (!filename) continue;
        if (!meta.date) continue;

        const filePath = path.join(contentDir, filename);
        if (!await fs.pathExists(filePath)) {
            console.warn(`警告: 文件 "${filename}" 不存在，已跳过。`);
            continue;
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { tags, content: markdownContent } = parseTagsAndContent(fileContent);
        
        const htmlContent = marked.parse(markdownContent);
        const title = meta.title || path.basename(filename, '.md');
        const slug = meta.slug || slugify(title);
        // 自动识别语言：优先使用显式声明，其次若文件名或 slug 以 -en 结尾则自动判定为 en，默认回退为 zh
        const lang = meta.lang || (filename.replace(/\.md$/i, '').endsWith('-en') || slug.endsWith('-en') ? 'en' : 'zh');

        // 检测是否存在数学公式
        const hasMath = /\$|\\\(|\\\[/.test(markdownContent);

        // 自动生成摘要和绝对 URL
        const summary = htmlContent.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
        const absoluteURL = `${siteConfig.baseURL}/${slug}.html`;
        
        allPosts.push({
            title,
            date: formatDate(meta.date),
            slug,
            tags,
            content: htmlContent,
            summary,
            url: absoluteURL,
            pin: !!meta.pin,
            hasMath,
            lang,
        });
    }

    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 3. 聚合标签数据
    const tagsMap = {};
    allPosts.forEach(post => {
        post.tags.forEach(tag => {
            if (!tagsMap[tag]) {
                tagsMap[tag] = [];
            }
            tagsMap[tag].push(post);
        });
    });
    
    // 4. 扫描法律文档列表 (content/legal/*.md)
    const legalPages = [];
    const targetLegalDir = (await fs.pathExists(legalDir))
        ? legalDir
        : (await fs.pathExists(path.join(__dirname, 'legal')) ? path.join(__dirname, 'legal') : null);
    if (targetLegalDir) {
        const legalFiles = await fs.readdir(targetLegalDir);
        for (const file of legalFiles) {
            if (!file.endsWith('.md')) continue;
            const filenameWithoutExt = path.basename(file, '.md');
            const lang = filenameWithoutExt.endsWith('-en') ? 'en' : 'zh';
            legalPages.push({
                file,
                slug: filenameWithoutExt,
                lang,
                filePath: path.join(targetLegalDir, file)
            });
        }
    }

    // 5. 跨语言对齐助手：自动为文章及文档计算互跳 URL，免除任何模板硬编码
    const allSlugs = new Set([...allPosts.map(p => p.slug), ...legalPages.map(p => p.slug)]);
    function resolveAltLangUrl(currentSlug, currentLang) {
        if (currentLang === 'en') {
            const baseSlug = currentSlug.replace(/-en$/, '');
            if (baseSlug !== currentSlug && allSlugs.has(baseSlug)) {
                return `${baseSlug}.html`;
            }
            return 'index.html';
        } else {
            const enSlug = `${currentSlug}-en`;
            if (allSlugs.has(enSlug)) {
                return `${enSlug}.html`;
            }
            return 'en.html';
        }
    }

    // 6. 渲染并生成文章页面
    const postTemplatePath = path.join(templatesDir, 'post.html');
    const postTemplate = await fs.readFile(postTemplatePath, 'utf-8');
    for (const post of allPosts) {
        post.altLangUrl = resolveAltLangUrl(post.slug, post.lang);
        const finalHtml = ejs.render(postTemplate, { post: post, site: siteConfig }, { filename: postTemplatePath });
        const outputPath = path.join(publicDir, `${post.slug}.html`);
        await fs.writeFile(outputPath, finalHtml);
        console.log(`-> 已生成: ${post.slug}.html`);
    }

    // 7. 渲染并生成法律独立页面
    if (targetLegalDir) {
        const pageTemplatePath = path.join(templatesDir, 'page.html');
        const pageTemplate = await fs.readFile(pageTemplatePath, 'utf-8');
        for (const legalItem of legalPages) {
            const fileContent = await fs.readFile(legalItem.filePath, 'utf-8');
            const lines = fileContent.split('\n');
            let title = legalItem.slug;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('# ')) {
                    title = trimmed.replace(/^#\s+/, '');
                    break;
                }
            }
            legalItem.title = title;
            legalItem.altLangUrl = resolveAltLangUrl(legalItem.slug, legalItem.lang);

            const htmlContent = marked.parse(fileContent);
            const finalHtml = ejs.render(pageTemplate, {
                page: {
                    title,
                    content: htmlContent,
                    lang: legalItem.lang,
                    slug: legalItem.slug,
                    altLangUrl: legalItem.altLangUrl,
                },
                site: siteConfig
            }, { filename: pageTemplatePath });

            const outputPath = path.join(publicDir, `${legalItem.slug}.html`);
            await fs.writeFile(outputPath, finalHtml);
            console.log(`-> 已生成法律文档: ${legalItem.slug}.html`);
        }
    }
    
    // 6. 语言分流：中文文章与英文文章
    const zhPosts = allPosts.filter(p => p.lang !== 'en');
    const enPosts = allPosts.filter(p => p.lang === 'en');

    // 7. 生成首页（中英文）
    console.log('\n开始生成聚合页面...');
    const indexTemplatePath = path.join(templatesDir, 'index.html');
    if (await fs.pathExists(indexTemplatePath)) {
        const indexTemplate = await fs.readFile(indexTemplatePath, 'utf-8');
        
        const sortPosts = (list) => [...list].sort((a, b) => {
            if (a.pin && !b.pin) return -1;
            if (!a.pin && b.pin) return 1;
            return new Date(b.date) - new Date(a.date);
        });

        // 中文首页 index.html
        const zhIndexPosts = sortPosts(zhPosts).slice(0, 10);
        const zhIndexHtml = ejs.render(indexTemplate, { posts: zhIndexPosts, site: siteConfig, lang: 'zh' }, { filename: indexTemplatePath });
        await fs.writeFile(path.join(publicDir, 'index.html'), zhIndexHtml);
        console.log(`-> 已生成: index.html (中文)`);

        // 英文首页 en.html
        const enIndexPosts = sortPosts(enPosts).slice(0, 10);
        const enIndexHtml = ejs.render(indexTemplate, { posts: enIndexPosts, site: siteConfig, lang: 'en' }, { filename: indexTemplatePath });
        await fs.writeFile(path.join(publicDir, 'en.html'), enIndexHtml);
        console.log(`-> 已生成: en.html (英文)`);
    }
    
    // 8. 生成归档页（中英文）
    const archiveTemplatePath = path.join(templatesDir, 'archive.html');
    if (await fs.pathExists(archiveTemplatePath)) {
        const archiveTemplate = await fs.readFile(archiveTemplatePath, 'utf-8');

        // 中文归档 archive.html
        const zhArchiveHtml = ejs.render(archiveTemplate, { posts: zhPosts, site: siteConfig, lang: 'zh' }, { filename: archiveTemplatePath });
        await fs.writeFile(path.join(publicDir, 'archive.html'), zhArchiveHtml);
        console.log(`-> 已生成: archive.html (中文)`);

        // 英文归档 archive-en.html
        const enArchiveHtml = ejs.render(archiveTemplate, { posts: enPosts, site: siteConfig, lang: 'en' }, { filename: archiveTemplatePath });
        await fs.writeFile(path.join(publicDir, 'archive-en.html'), enArchiveHtml);
        console.log(`-> 已生成: archive-en.html (英文)`);
    }
    
    // 9. 生成标签页
    const tagTemplatePath = path.join(templatesDir, 'tag.html');
    if (await fs.pathExists(tagTemplatePath)) {
        const tagTemplate = await fs.readFile(tagTemplatePath, 'utf-8');
        for (const tag in tagsMap) {
            const posts = tagsMap[tag];
            const tagHtml = ejs.render(tagTemplate, { tag, posts, site: siteConfig }, { filename: tagTemplatePath });
            const outputPath = path.join(publicDir, `tag-${tag}.html`);
            await fs.writeFile(outputPath, tagHtml);
            console.log(`-> 已生成标签页: tag-${tag}.html`);
        }
    }

    // 10. 生成关于页（中英文）
    const aboutTemplatePath = path.join(templatesDir, 'about.html');
    if (await fs.pathExists(aboutTemplatePath)) {
        const aboutTemplate = await fs.readFile(aboutTemplatePath, 'utf-8');
        
        // 中文关于页 about.html
        const zhAboutHtml = ejs.render(aboutTemplate, { site: siteConfig, lang: 'zh' }, { filename: aboutTemplatePath });
        await fs.writeFile(path.join(publicDir, 'about.html'), zhAboutHtml);
        console.log(`-> 已生成: about.html (中文)`);

        // 英文关于页 about-en.html
        const enAboutHtml = ejs.render(aboutTemplate, { site: siteConfig, lang: 'en' }, { filename: aboutTemplatePath });
        await fs.writeFile(path.join(publicDir, 'about-en.html'), enAboutHtml);
        console.log(`-> 已生成: about-en.html (英文)`);
    }

    generateRss(allPosts, siteConfig);
    generateSitemap(allPosts, Object.keys(tagsMap), legalPages, siteConfig);
    
    console.log(`\n构建完成！共处理 ${allPosts.length} 篇文章，${legalPages.length} 篇法律文档。`);
}

// 4. 新增的生成函数
function generateRss(posts, site) {
    const feed = new RSS({
        title: site.title,
        description: site.description,
        feed_url: `${site.baseURL}/rss.xml`,
        site_url: site.baseURL,
        language: 'zh-CN',
    });

    // 只将最新的 20 篇文章放入 RSS
    posts.slice(0, 20).forEach(post => {
        feed.item({
            title: post.title,
            description: post.content, // 在 RSS 中我们提供全文
            url: post.url,
            guid: post.url,
            date: post.date,
        });
    });

    const xml = feed.xml({ indent: true });
    fs.writeFileSync(path.join(publicDir, 'rss.xml'), xml);
    console.log(`-> 已生成: rss.xml`);
}

async function generateSitemap(posts, tags, legalPages, site) {
    const stream = new SitemapStream({ hostname: site.baseURL });
    
    // 添加核心页面
    stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    stream.write({ url: '/en.html', changefreq: 'daily', priority: 0.9 });
    stream.write({ url: '/archive.html', changefreq: 'weekly', priority: 0.7 });
    stream.write({ url: '/archive-en.html', changefreq: 'weekly', priority: 0.7 });
    stream.write({ url: '/about.html', changefreq: 'monthly', priority: 0.6 });
    stream.write({ url: '/about-en.html', changefreq: 'monthly', priority: 0.6 });

    // 添加法律文档页面
    (legalPages || []).forEach(page => {
        stream.write({ url: `/${page.slug}.html`, changefreq: 'monthly', priority: 0.6 });
    });

    // 添加文章页面
    posts.forEach(post => {
        stream.write({ url: `/${post.slug}.html`, changefreq: 'weekly', priority: 0.8, lastmod: post.date });
    });

    // 添加标签页面
    tags.forEach(tag => {
        stream.write({ url: `/tag-${tag}.html`, changefreq: 'monthly', priority: 0.5 });
    });

    stream.end();
    const sitemap = await streamToPromise(stream).then((data) => data.toString());
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log(`-> 已生成: sitemap.xml`);
}

// 执行构建并捕获错误
build().catch(error => {
    console.error('构建过程中发生错误:', error);
    process.exit(1);
});