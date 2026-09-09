# Oh My Dango Blog

一个基于 Node.js 构建的轻量级静态博客生成器。专为“团子画板”项目及其开发日志设计。

## 🚀 特性

- **极简构建**：基于 `build.js` 脚本，无需复杂的框架，构建速度极快。
- **Markdown 支持**：使用 [marked](https://marked.js.org/) 解析 Markdown 内容。
- **模板系统**：使用 [EJS](https://ejs.co/) 模板引擎，轻松定制页面布局。
- **元数据驱动**：通过 `metadata.toml` 统一管理站点信息和文章发布状态。
- **标签系统**：自动从文章首行解析 `#标签`，并生成聚合页面。
- **SEO 友好**：自动生成 `sitemap.xml` 和自定义 `slug` 支持。
- **订阅支持**：自动生成 `rss.xml` 馈送。

## 📂 项目结构

```text
.
├── content/          # 存放 Markdown 文章原件
├── static/           # 静态资源（CSS, 图片等）
├── templates/        # EJS 页面模板
├── metadata.toml     # 站点配置与文章元数据
├── build.js          # 核心构建脚本
├── package.json      # 项目依赖与脚本
└── public/           # 构建生成的静态网站（运行构建后生成）
```

## 🛠️ 快速开始

### 1. 安装依赖

确保你已安装 [Node.js](https://nodejs.org/)，然后在项目根目录运行：

```bash
npm install
```

### 2. 配置站点

编辑 `metadata.toml` 文件，设置你的站点标题、基本 URL 和描述。

```toml
[site]
title = "你的博客标题"
baseURL = "https://your-domain.com"
description = "站点描述"
```

### 3. 撰写文章

在 `content/` 目录下创建 `.md` 文件。
文章首行可以包含标签，例如：`#技术 #随笔`。

然后在 `metadata.toml` 中添加文章记录：

```toml
[[post]]
file = "你的文章文件名.md"
date = 2024-01-26
slug = "custom-url-slug" # 可选，默认为文件名
```

### 4. 构建站点

执行构建命令：

```bash
npm run build
```

构建完成后，所有的静态文件将生成在 `public/` 目录下。

## 🎨 自定义

你可以通过修改 `templates/` 下的 `.html` 文件来改变网站的外观。该项目使用了以下模板：

- `index.html`: 首页
- `post.html`: 文章详情页
- `archive.html`: 归档页
- `tag.html`: 标签聚合页
- `about.html`: 关于页
- `_header.html`, `_footer.html`, `_nav.html`: 公共组件

## 📄 开源协议

本项目采用 [AGPL-3.0 license](LICENSE) 协议。
