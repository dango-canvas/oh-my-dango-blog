const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const toml = require('@iarna/toml');
const ejs = require('ejs');
const RSS = require('rss');
const { SitemapStream, streamToPromise } = require('sitemap');
// --- 路径定义 ---
const contentDir = path.join(__dirname, 'content');
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

    // 1. 读取站点配置
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

        // 2. 自动生成摘要和绝对 URL
        const summary = htmlContent.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
        const absoluteURL = `${siteConfig.baseURL}/${slug}.html`;
        
        allPosts.push({
            title,
            date: formatDate(meta.date),
            slug,
            tags,
            content: htmlContent,
            summary, // 新增
            url: absoluteURL, // 新增
        });
    }

    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 5.5. 聚合标签数据
    const tagsMap = {};
    allPosts.forEach(post => {
        post.tags.forEach(tag => {
            if (!tagsMap[tag]) {
                tagsMap[tag] = [];
            }
            tagsMap[tag].push(post);
        });
    });
    
    // 6. 渲染并生成文章页面
    const postTemplatePath = path.join(templatesDir, 'post.html'); // <--- 移到循环外
    const postTemplate = await fs.readFile(postTemplatePath, 'utf-8');
    for (const post of allPosts) {
        const finalHtml = ejs.render(postTemplate, { post: post, site: siteConfig }, { filename: postTemplatePath }); // <--- 添加 options
        const outputPath = path.join(publicDir, `${post.slug}.html`);
        await fs.writeFile(outputPath, finalHtml);
        console.log(`-> 已生成: ${post.slug}.html`);
    }
    
    // 7. 生成首页
    console.log('\n开始生成聚合页面...');
    const indexTemplatePath = path.join(templatesDir, 'index.html');
    if (await fs.pathExists(indexTemplatePath)) {
        const indexTemplate = await fs.readFile(indexTemplatePath, 'utf-8');
        const indexHtml = ejs.render(indexTemplate, { posts: allPosts.slice(0, 10), site: siteConfig }, { filename: indexTemplatePath }); // <--- 添加 options
        await fs.writeFile(path.join(publicDir, 'index.html'), indexHtml);
        console.log(`-> 已生成: index.html`);
    }
    
    // 8. 生成归档页 <--- 新增部分开始 --->
    const archiveTemplatePath = path.join(templatesDir, 'archive.html');
    if (await fs.pathExists(archiveTemplatePath)) {
        const archiveTemplate = await fs.readFile(archiveTemplatePath, 'utf-8');
        const archiveHtml = ejs.render(archiveTemplate, { posts: allPosts, site: siteConfig }, { filename: archiveTemplatePath }); // <--- 添加 options
        await fs.writeFile(path.join(publicDir, 'archive.html'), archiveHtml);
        console.log(`-> 已生成: archive.html`);
    }
    
    // 9. 生成标签页
    const tagTemplatePath = path.join(templatesDir, 'tag.html');
    if (await fs.pathExists(tagTemplatePath)) {
        const tagTemplate = await fs.readFile(tagTemplatePath, 'utf-8');
        for (const tag in tagsMap) {
            const posts = tagsMap[tag];
            const tagHtml = ejs.render(tagTemplate, { tag, posts, site: siteConfig }, { filename: tagTemplatePath }); // <--- 添加 options
            const outputPath = path.join(publicDir, `tag-${tag}.html`);
            await fs.writeFile(outputPath, tagHtml);
            console.log(`-> 已生成标签页: tag-${tag}.html`);
        }
    }

    // 10. 生成关于页
    const aboutTemplatePath = path.join(templatesDir, 'about.html');
    if (await fs.pathExists(aboutTemplatePath)) {
        const aboutTemplate = await fs.readFile(aboutTemplatePath, 'utf-8');
        const aboutHtml = ejs.render(aboutTemplate, { site: siteConfig }, { filename: aboutTemplatePath });
        await fs.writeFile(path.join(publicDir, 'about.html'), aboutHtml);
        console.log(`-> 已生成: about.html`);
    }
    // TODO: 在这里添加生成首页、归档页和标签页的逻辑
    // const indexTemplate = ...
    // const archiveTemplate = ...
    generateRss(allPosts, siteConfig);
    generateSitemap(allPosts, Object.keys(tagsMap), siteConfig);
    
    console.log(`\n构建完成！共处理 ${allPosts.length} 篇文章。`);
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

async function generateSitemap(posts, tags, site) {
    const stream = new SitemapStream({ hostname: site.baseURL });
    
    // 添加核心页面
    stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    stream.write({ url: '/archive.html', changefreq: 'weekly', priority: 0.7 });

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