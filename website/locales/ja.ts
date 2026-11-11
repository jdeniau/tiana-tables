import { SiteMessages } from './type';

const ja: SiteMessages = {
  'meta.title': 'Tiana Tables：開発者のための SQL クライアント',
  'meta.description':
    '開発者のための MySQL、MariaDB、PostgreSQL クライアント。Linux、macOS、Windows で動きます。データの閲覧、クエリ、編集を効率よく行えます。使いやすく、見た目もきれいです。',
  'nav.label': 'セクション',
  'nav.editor': 'エディター',
  'nav.browse': '閲覧',
  'nav.keyboard': 'キーボード',
  'nav.privacy': 'プライバシー',
  'nav.charts': 'グラフ',
  'nav.themes': 'テーマ',
  'nav.ssh': 'SSH',
  'nav.download': 'ダウンロード',
  'language.current': '言語：{name}',
  'theme.label': 'テーマ',
  'theme.system': 'システムのテーマ',
  'theme.dark': 'ダーク',
  'theme.light': 'ライト',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': '開発者のための SQL クライアント',
  'hero.title.short': '開発者向け SQL クライアント',
  'hero.lead':
    'キーボードから手を離さずに、データの閲覧、クエリ、編集を効率よく行えます。使いやすく、見た目もきれいで、マルチプラットフォームです。',
  'hero.download': 'ダウンロード',
  'hero.source': 'GitHub のソースコード',
  'hero.other': 'ほかのプラットフォーム',
  'spec.engines': 'データベース',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': '対応 OS',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': '接続',
  'spec.connects.value': '直接、SSL、SSH トンネル',
  'spec.themes': 'テーマ',
  'spec.themes.value': '{count, number} 種類',
  'spec.languages': '言語',
  'spec.languages.value': '英語、フランス語',
  'spec.account': 'アカウント',
  'spec.account.value': 'なし。テレメトリもなし',
  'spec.license': 'ライセンス',
  'spec.latest': 'バージョン',
  'app.label':
    'article テーブルをステータスで絞り込んで表示している Tiana Tables',
  'app.caption':
    'このウィンドウは HTML で、アプリと同じく、タイトルバーで選んだパレットで描かれています。サンプルデータは開発用データセット「Le Fil」です。',

  'editor.title': 'SQL エディター',
  'editor.meta': 'Monaco、VS Code のエディター',
  'editor.lead':
    'データベースエンジンの文法とデータベースのスキーマを把握しているので、キーワードに色を付けるだけではありません。',
  'editor.items': [
    'テーブル、カラム、エイリアスを補完します。<code>a.</code> の後には、そのテーブルのカラムだけが候補に出ます。',
    '<code>FROM</code> や <code>JOIN</code> でテーブルを補完すると、エイリアスも付けます。外部キーでクエリ内の既存のテーブルとつながっていれば、<code>ON</code> 句も追加します。',
    'カーソル位置で有効なキーワードだけを候補に出します。',
    '入力中に構文エラーに下線を引き、<code>u.emial</code> のような存在しないカラムを警告します。正しい SQL では何も出ません。',
    'カーソル位置のステートメントを実行します。すべてを順に実行し、最初のエラーで止めることもできます。',
  ],
  'editor.label': 'a. の後に補完リストが開いている SQL クエリ',

  'browse.title': '閲覧',
  'browse.meta': '仮想化グリッド、瞬時の描画',
  'browse.lead':
    'カラムの多いテーブルもカクつかずにスクロールでき、続きの行もワンクリックで読み込めます。',
  'browse.items': [
    '<code>WHERE</code> 句で絞り込めます。条件はテーブルごとに記憶されます。',
    'セルを右クリックすると、その値、クリップボードの内容、または好きな条件で絞り込めます。',
    '外部キーはリンクです。クリックすると参照先の行に移動します。',
    'クリックしたセルの値をコピーできます。行全体を TSV、CSV、Markdown、JSON、SQL の <code>INSERT</code> としてコピーすることもできます。',
  ],

  'edit.title': '編集',
  'edit.meta': '楽観的な競合検出',
  'edit.lead':
    'セルをダブルクリックすると、カラムの型に合ったエディターが開きます。',
  'edit.editors.label': 'セルのエディター',
  'edit.editors': ['日付ピッカー', 'ENUM / SET', 'JSON', 'テキスト'],
  'edit.text':
    '読み込んだ後に値が変更されたり、行が削除されたりしていた場合は、どうするかを自分で選べます。黙って上書きされることはありません。書き込めないセルは、その理由を示します：主キーがない、生成カラム、バイナリカラム。',

  'keyboard.title': 'キーボード',
  'keyboard.meta': '主なショートカット',
  'keyboard.lead':
    'テーブルからテーブルへ、グリッドからエディターへ。手はキーボードに置いたままで大丈夫です。',
  'keyboard.text':
    'キー操作は VS Code とブラウザーに合わせてあり、メニューやボタンにもショートカットが表示されるので、使いながら覚えられます。',
  'keyboard.navigate': 'テーブルやデータベースに移動',
  'keyboard.sqlPanel': 'SQL パネルを開く',
  'keyboard.run': 'カーソル位置のステートメントを実行',
  'keyboard.move': 'セル間を移動',
  'keyboard.extend': '選択範囲を広げる',
  'keyboard.edit': 'セルを編集',
  'keyboard.delete': 'NULL にする、または行を削除',
  'keyboard.copy': 'セルや行をコピー',
  'keyboard.goToId': 'id で行に移動',
  'keyboard.escape.key': 'Esc',
  'keyboard.escape': '選択を解除',
  'keyboard.connection': '次の接続',
  'keyboard.history': '戻る、進む',

  'privacy.title': '手元のマシン',
  'privacy.meta': '認証情報',
  'privacy.statement': [
    'アカウント不要。',
    'クラウド同期なし。',
    'テレメトリなし。',
  ],
  'privacy.lead':
    'Tiana Tables は手元のマシンで動き、お使いのデータベースに接続します。',
  'privacy.text':
    '接続のパスワードは、システムのキーチェーンで暗号化されます。キーチェーンがない場合は、パスワードが難読化されているだけだと、ごまかさずに伝えます。',

  'databases.title': 'データベース',
  'databases.meta': '対応範囲',
  'databases.ssl': 'SSL（必須または検証あり）',
  'databases.ssh': 'SSH トンネル',
  'databases.others': 'その他の SQL データベースエンジン',
  'databases.admin': 'サーバーとユーザーの管理',
  'databases.supported': '対応',
  'databases.outOfScope': '対象外',
  'databases.text':
    'PostgreSQL の接続は 1 つのデータベースを開き、MySQL サーバーならデータベースが並ぶ場所に、そのスキーマを並べます。SQL 標準に十分近いほかのエンジンは、issue で相談できます。',

  'charts.title': 'グラフ',
  'charts.meta': '棒グラフか折れ線グラフ、どんな結果からでも',
  'charts.lead':
    '数値のカラムを含む SQL クエリの結果なら、どれでも棒グラフや折れ線グラフになります。X 軸と系列は自分で選べます。',
  'charts.quote':
    '<code>LIMIT</code> 付きの結果は、あえて受け付けません。一部だけの結果のグラフは嘘をつくからです。',
  'charts.text':
    '画像としてコピーしたり、頼まれたスライド用に PNG で保存したりできます。',
  'charts.label':
    '月ごとの閲覧数と識別済みの読者数、2024 年 1 月から 2026 年 9 月まで、どちらも増加',

  'themes.title': 'テーマ',
  'themes.meta': '{count, number} 種類の base16 パレット · T キーで切り替え',
  'themes.lead':
    'Dracula から Solarized まで、ライトもダークもあります。テーマはグリッドや SQL エディターを含むアプリ全体に適用されます。このページも同じパレットを使っています。好きなものを選んでください。',

  'ssh.title': 'SSH トンネル',
  'ssh.meta': 'v1.24.0 から',
  'ssh.lead':
    'ターミナルと同じやり方で、SSH サーバーの先にあるデータベースに接続できます。',
  'ssh.items': [
    'トンネルはお使いのマシンの <code>ssh</code> コマンドを実行するので、<code>~/.ssh/config</code>、<code>known_hosts</code>、SSH エージェントがそのまま使われます。',
    'SSH ユーザーを空欄にすると、config の設定が使われます。',
    'ssh が尋ねることは、アプリも尋ねます。未知のサーバーは信頼する前にフィンガープリントを表示し、鍵にパスフレーズが必要なときは入力を求めます。',
    'データベースのホストとポートには、SSH サーバーから見たものを指定します。',
  ],
  'ssh.caption':
    'フォームと、アプリが表示する確認ダイアログの値はサンプルです。',

  'download.title': 'ダウンロード',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'プラットフォーム',
  'download.file': 'ファイル',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': '.deb をダウンロード',
  'download.button.rpm': '.rpm をダウンロード',
  'download.button.macArm': 'Apple silicon 版をダウンロード',
  'download.button.macIntel': 'Intel 版',
  'download.button.windowsSetup': 'Windows 版をダウンロード',
  'download.note.linux': 'Debian と Ubuntu は .deb、Fedora と openSUSE は .rpm',
  'download.note.macos':
    'M1 以降は Apple silicon 版、それより前の Mac は Intel 版',
  'download.note.windows': '64 ビット Windows 用インストーラー',
  'download.all':
    'すべてのバージョンとリリースノートは、<link>リリースページ</link>にあります。',
  'download.source': 'Node 26 を使って、ソースからビルドすることもできます：',
  'download.contributing':
    'コントリビューションを歓迎します。<link>CONTRIBUTING.md</link> をご覧ください。',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default ja;
