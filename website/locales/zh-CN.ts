import { SiteMessages } from './type';

const zhCn: SiteMessages = {
  'meta.title': 'Tiana Tables：面向开发者的 SQL 客户端',
  'meta.description':
    '面向开发者的 MySQL、MariaDB 和 PostgreSQL 客户端，支持 Linux、macOS 和 Windows。高效地浏览、查询和编辑你的数据。简单易用，界面美观。',
  'nav.label': '目录',
  'nav.editor': '编辑器',
  'nav.browse': '浏览',
  'nav.keyboard': '键盘',
  'nav.privacy': '隐私',
  'nav.charts': '图表',
  'nav.themes': '主题',
  'nav.ssh': 'SSH',
  'nav.download': '下载',
  'language.current': '语言：{name}',
  'theme.label': '主题',
  'theme.system': '跟随系统',
  'theme.dark': '深色',
  'theme.light': '浅色',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': '面向开发者的 SQL 客户端',
  'hero.title.short': '开发者的 SQL 客户端',
  'hero.lead':
    '高效地浏览、查询和编辑你的数据，双手不用离开键盘。简单易用，界面美观，跨平台。',
  'hero.download': '下载',
  'hero.source': 'GitHub 上的源码',
  'hero.other': '其他平台',
  'spec.engines': '数据库',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': '系统',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': '连接',
  'spec.connects.value': '直连、SSL 或 SSH 隧道',
  'spec.themes': '主题',
  'spec.themes.value': '{count, number} 个主题',
  'spec.languages': '语言',
  'spec.languages.value': '英语、法语',
  'spec.account': '账号',
  'spec.account.value': '无需。无遥测',
  'spec.license': '许可证',
  'spec.latest': '版本',
  'app.label': 'Tiana Tables 正在浏览 article 表，按状态筛选',
  'app.caption':
    '这个窗口是 HTML，和应用一样，用标题栏中选择的配色绘制。示例数据：开发数据集“Le Fil”。',

  'editor.title': 'SQL 编辑器',
  'editor.meta': 'Monaco，VS Code 的编辑器',
  'editor.lead':
    '它了解你的数据库引擎的语法和库表结构，所以不只是给关键字上色。',
  'editor.items': [
    '补全表名、列名和别名。在 <code>a.</code> 之后，只会列出这张表的列。',
    '在 <code>FROM</code> 或 <code>JOIN</code> 中补全表名时，会写上它的别名；如果有外键把它和查询中已有的表关联起来，还会写上 <code>ON</code> 子句。',
    '只提示在光标位置有效的关键字。',
    '输入时就给语法错误加下划线，并对 <code>u.emial</code> 这样的未知列发出警告。合法的 SQL 绝不会被误报。',
    '执行光标所在的语句，或按顺序执行全部语句，遇到第一个错误即停止。',
  ],
  'editor.label': '在 a. 之后打开补全列表的 SQL 查询',

  'browse.title': '浏览',
  'browse.meta': '虚拟化表格，即时渲染',
  'browse.lead': '再宽的表也能流畅滚动，后面的行只需点击一下即可加载。',
  'browse.items': [
    '用 <code>WHERE</code> 子句筛选，每张表都会记住筛选条件。',
    '右键点击单元格，可以按它的值、剪贴板内容或任意条件筛选。',
    '外键是链接：点击即可跳转到被引用的行。',
    '复制所点单元格的值，或把整行复制为 TSV、CSV、Markdown、JSON 或 SQL <code>INSERT</code>。',
  ],

  'edit.title': '编辑',
  'edit.meta': '乐观冲突检测',
  'edit.lead': '双击单元格，打开与其列类型对应的编辑器。',
  'edit.editors.label': '单元格编辑器',
  'edit.editors': ['日期选择器', 'ENUM / SET', 'JSON', '文本'],
  'edit.text':
    '如果在你加载之后，值被修改了或者行被删除了，由你决定怎么处理。任何内容都不会被悄悄覆盖。无法写入的单元格会说明原因：没有主键、生成列、二进制列。',

  'keyboard.title': '键盘',
  'keyboard.meta': '主要快捷键',
  'keyboard.lead':
    '从一张表到另一张表，从表格到编辑器：双手可以一直留在键盘上。',
  'keyboard.text':
    '按键沿用 VS Code 和浏览器的习惯，菜单和按钮也会显示各自的快捷键，用着用着就记住了。',
  'keyboard.navigate': '跳转到表或数据库',
  'keyboard.sqlPanel': '打开 SQL 面板',
  'keyboard.run': '执行光标所在的语句',
  'keyboard.move': '在单元格之间移动',
  'keyboard.extend': '扩展选区',
  'keyboard.edit': '编辑单元格',
  'keyboard.delete': '设为 NULL，或删除行',
  'keyboard.copy': '复制单元格或行',
  'keyboard.goToId': '按 id 跳转到行',
  'keyboard.escape.key': 'Esc',
  'keyboard.escape': '清除选区',
  'keyboard.connection': '下一个连接',
  'keyboard.history': '后退、前进',

  'privacy.title': '你的电脑',
  'privacy.meta': '凭据',
  'privacy.statement': ['无需账号。', '无云同步。', '无遥测。'],
  'privacy.lead': 'Tiana Tables 运行在你的电脑上，直连你的数据库。',
  'privacy.text':
    '连接密码通过系统钥匙串加密。如果系统没有钥匙串，应用会如实告诉你密码只是做了混淆，而不会假装加密了。',

  'databases.title': '数据库',
  'databases.meta': '支持范围',
  'databases.ssl': 'SSL，必需或验证',
  'databases.ssh': 'SSH 隧道',
  'databases.others': '其他 SQL 数据库',
  'databases.admin': '服务器和用户管理',
  'databases.supported': '支持',
  'databases.outOfScope': '不在范围内',
  'databases.text':
    'PostgreSQL 连接会打开一个数据库，并在 MySQL 服务器列出数据库的地方，列出它的模式（schema）。其他与 SQL 标准足够接近的引擎，可以在 issue 中讨论。',

  'charts.title': '图表',
  'charts.meta': '柱状图或折线图，来自任意结果',
  'charts.lead':
    '任何带数值列的 SQL 结果，都能变成柱状图或折线图。X 轴和数据系列由你来选。',
  'charts.quote':
    '带 <code>LIMIT</code> 的结果会被特意拒绝：基于部分结果的图表会说谎。',
  'charts.text': '可以复制为图片，或者保存为 PNG，放进别人要你做的幻灯片里。',
  'charts.label':
    '每月阅读量和已识别读者数，2024 年 1 月至 2026 年 9 月，均呈上升趋势',

  'themes.title': '主题',
  'themes.meta': '{count, number} 套 base16 配色 · 按 T 切换',
  'themes.lead':
    '从 Dracula 到 Solarized，有浅色也有深色。主题作用于整个应用，包括表格和 SQL 编辑器。本页使用同样的配色：挑一个吧。',

  'ssh.title': 'SSH 隧道',
  'ssh.meta': '自 v1.24.0 起',
  'ssh.lead': '像终端那样，访问 SSH 服务器后面的数据库。',
  'ssh.items': [
    '隧道运行的是你电脑上的 <code>ssh</code> 命令：你的 <code>~/.ssh/config</code>、<code>known_hosts</code> 和 SSH agent 都会生效。',
    'SSH 用户名留空，就会从你的 config 中读取。',
    'ssh 会问的，应用也会问：未知服务器在你信任它之前会显示指纹，密钥需要密码短语时会提示你输入。',
    '数据库的主机和端口，填写 SSH 服务器所看到的地址。',
  ],
  'ssh.caption': '示例值，出现在表单和应用显示的提问中。',

  'download.title': '下载',
  'download.meta': 'v{version} · MIT',
  'download.platform': '平台',
  'download.file': '文件',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': '下载 .deb',
  'download.button.rpm': '.rpm',
  'download.button.macArm': '下载 Apple silicon 版',
  'download.button.macIntel': 'Intel 版',
  'download.button.windowsSetup': '下载 Windows 版',
  'download.note.linux': 'Debian 和 Ubuntu 用 .deb，Fedora 和 openSUSE 用 .rpm',
  'download.note.macos':
    'M1 及更新的 Mac 用 Apple silicon 版，较旧的 Mac 用 Intel 版',
  'download.note.windows': '64 位 Windows 安装程序',
  'download.all': '所有版本及其发布说明，见 <link>Releases 页面</link>。',
  'download.source': '也可以用 Node 26 从源码构建：',
  'download.contributing': '欢迎贡献：请参阅 <link>CONTRIBUTING.md</link>。',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default zhCn;
