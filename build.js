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

    const allPosts = [];

    // 3. 遍历元数据，处理每篇文章
    for (const filename in metadata) {
        const meta = metadata[filename];
        if (!meta.date) continue;

        const filePath = path.join(contentDir, filename);
        if (!await fs.pathExists(filePath)) {
            console.warn(`警告: 文件 "${filename}" 不存在，已跳过。`);
            continue;
        }

        // 4. 读取文件并解析内容和标签
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { tags, content: markdownContent } = parseTagsAndContent(fileContent);
        
        const htmlContent = marked.parse(markdownContent);
        const title = path.basename(filename, '.md');
        
        allPosts.push({
            title,
            date: formatDate(meta.date),
            slug: meta.slug || slugify(title),
            tags,
            content: htmlContent,
        });
    }

    // 5. 按日期排序
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
    const postTemplate = await fs.readFile(path.join(templatesDir, 'post.html'), 'utf-8');
    for (const post of allPosts) {
        const finalHtml = ejs.render(postTemplate, post);
        const outputPath = path.join(publicDir, `${post.slug}.html`);
        await fs.writeFile(outputPath, finalHtml);
        console.log(`-> 已生成: ${post.slug}.html`);
    }
    
    // 7. 生成首页
    console.log('\n开始生成聚合页面...');
    const indexTemplatePath = path.join(templatesDir, 'index.html');
    if (await fs.pathExists(indexTemplatePath)) {
        const indexTemplate = await fs.readFile(indexTemplatePath, 'utf-8');
        // 比如我们只在首页展示最新的 10 篇文章
        const indexHtml = ejs.render(indexTemplate, { posts: allPosts.slice(0, 10) });
        await fs.writeFile(path.join(publicDir, 'index.html'), indexHtml);
        console.log(`-> 已生成: index.html`);
    }
    
    // 8. 生成归档页 <--- 新增部分开始 --->
    const archiveTemplatePath = path.join(templatesDir, 'archive.html');
    if (await fs.pathExists(archiveTemplatePath)) {
        const archiveTemplate = await fs.readFile(archiveTemplatePath, 'utf-8');
        // 将所有文章传递给归档页
        const archiveHtml = ejs.render(archiveTemplate, { posts: allPosts });
        await fs.writeFile(path.join(publicDir, 'archive.html'), archiveHtml);
        console.log(`-> 已生成: archive.html`);
    }
    
    // 9. 生成标签页
    const tagTemplatePath = path.join(templatesDir, 'tag.html');
    if (await fs.pathExists(tagTemplatePath)) {
        const tagTemplate = await fs.readFile(tagTemplatePath, 'utf-8');
        for (const tag in tagsMap) {
            const posts = tagsMap[tag];
            const tagHtml = ejs.render(tagTemplate, { tag, posts });
            // 注意这里我们不再创建子目录，而是直接生成 tag-xxx.html 文件
            const outputPath = path.join(publicDir, `tag-${tag}.html`);
            await fs.writeFile(outputPath, tagHtml);
            console.log(`-> 已生成标签页: tag-${tag}.html`);
        }
    }
    // TODO: 在这里添加生成首页、归档页和标签页的逻辑
    // const indexTemplate = ...
    // const archiveTemplate = ...

    console.log(`\n构建完成！共处理 ${allPosts.length} 篇文章。`);
}

// 执行构建并捕获错误
build().catch(error => {
    console.error('构建过程中发生错误:', error);
    process.exit(1);
});