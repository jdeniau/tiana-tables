import { SiteMessages } from './type';

const ptBr: SiteMessages = {
  'meta.title': 'Tiana Tables: um cliente SQL para quem programa',
  'meta.description':
    'Um cliente MySQL, MariaDB e PostgreSQL para quem programa, no Linux, macOS e Windows. Navegue, consulte e edite seus dados com eficiência. Fácil de usar e bonito.',
  'nav.label': 'Seções',
  'nav.editor': 'Editor',
  'nav.browse': 'Navegar',
  'nav.keyboard': 'Teclado',
  'nav.privacy': 'Privacidade',
  'nav.charts': 'Gráficos',
  'nav.themes': 'Temas',
  'nav.ssh': 'SSH',
  'nav.download': 'Download',
  'language.current': 'Idioma: {name}',
  'theme.label': 'Tema',
  'theme.system': 'Tema do sistema',
  'theme.dark': 'Escuros',
  'theme.light': 'Claros',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': 'Um cliente SQL para quem programa',
  'hero.title.short': 'Um cliente SQL para devs',
  'hero.lead':
    'Navegue, consulte e edite seus dados com eficiência, sem tirar as mãos do teclado. Fácil de usar, bonito e multiplataforma.',
  'hero.download': 'Baixar',
  'hero.source': 'Código no GitHub',
  'hero.other': 'Outras plataformas',
  'spec.engines': 'Bancos de dados',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': 'Sistemas',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': 'Conexão',
  'spec.connects.value': 'Direta, SSL ou túnel SSH',
  'spec.themes': 'Temas',
  'spec.themes.value': '{count, number} temas',
  'spec.languages': 'Idiomas',
  'spec.languages.value': 'Inglês, francês',
  'spec.account': 'Conta',
  'spec.account.value': 'Nenhuma. Sem telemetria',
  'spec.license': 'Licença',
  'spec.latest': 'Versão',
  'app.label': 'Tiana Tables exibindo a tabela article, filtrada pelo status',
  'app.caption':
    'Esta janela é HTML, desenhada com a paleta escolhida na barra de título, como no aplicativo. Dados de exemplo: “Le Fil”, o conjunto de dados de desenvolvimento.',

  'editor.title': 'Editor SQL',
  'editor.meta': 'Monaco, o editor do VS Code',
  'editor.lead':
    'Ele conhece a gramática do seu SGBD e o esquema do seu banco de dados: faz mais do que colorir palavras-chave.',
  'editor.items': [
    'Completa tabelas, colunas e aliases. Depois de <code>a.</code>, você recebe as colunas dessa tabela e nada mais.',
    'Ao completar uma tabela no <code>FROM</code> ou no <code>JOIN</code>, ele escreve o alias dela, e a cláusula <code>ON</code> quando uma chave estrangeira a liga a uma tabela que já está na consulta.',
    'Sugere só as palavras-chave válidas na posição do cursor.',
    'Sublinha erros de sintaxe enquanto você digita e avisa sobre colunas desconhecidas como <code>u.emial</code>. Nunca em SQL válido.',
    'Executa a instrução sob o cursor, ou todas em ordem, parando no primeiro erro.',
  ],
  'editor.label':
    'Consulta SQL com a lista de autocompletar aberta depois de a.',

  'browse.title': 'Navegar',
  'browse.meta': 'grade virtualizada, renderização instantânea',
  'browse.lead':
    'Uma tabela larga rola sem engasgos, e as próximas linhas estão a um clique.',
  'browse.items': [
    'Filtre com uma cláusula <code>WHERE</code>, lembrada para cada tabela.',
    'Clique com o botão direito numa célula para filtrar pelo valor dela, pela sua área de transferência ou pelo que você quiser.',
    'Chaves estrangeiras são links: um clique leva à linha referenciada.',
    'Copie os valores das células em que você clica, ou linhas inteiras como TSV, CSV, Markdown, JSON ou <code>INSERT</code> SQL.',
  ],

  'edit.title': 'Editar',
  'edit.meta': 'detecção otimista de conflitos',
  'edit.lead':
    'Dê um duplo clique numa célula para abrir o editor do tipo da coluna dela.',
  'edit.editors.label': 'Editores de célula',
  'edit.editors': ['seletor de data', 'ENUM / SET', 'JSON', 'texto'],
  'edit.text':
    'Se o valor mudou, ou se a linha foi excluída, desde que você a carregou, você escolhe o que acontece. Nada é sobrescrito em silêncio. Uma célula que não pode ser gravada diz por quê: sem chave primária, coluna gerada, coluna binária.',

  'keyboard.title': 'Teclado',
  'keyboard.meta': 'os principais atalhos',
  'keyboard.lead':
    'De uma tabela para outra, da grade para o editor: suas mãos podem ficar no teclado.',
  'keyboard.text':
    'As teclas seguem o VS Code e o seu navegador, e os menus e botões mostram as deles, então você aprende usando.',
  'keyboard.navigate': 'Ir para uma tabela ou um banco de dados',
  'keyboard.sqlPanel': 'Abrir o painel SQL',
  'keyboard.run': 'Executar a instrução sob o cursor',
  'keyboard.move': 'Ir de célula em célula',
  'keyboard.extend': 'Estender a seleção',
  'keyboard.edit': 'Editar a célula',
  'keyboard.delete': 'Definir como NULL, ou excluir as linhas',
  'keyboard.copy': 'Copiar as células ou as linhas',
  'keyboard.goToId': 'Ir para uma linha pelo id',
  'keyboard.escape.key': 'Esc',
  'keyboard.escape': 'Limpar a seleção',
  'keyboard.connection': 'Próxima conexão',
  'keyboard.history': 'Voltar, avançar',

  'privacy.title': 'Sua máquina',
  'privacy.meta': 'credenciais',
  'privacy.statement': [
    'Sem conta.',
    'Sem sincronização na nuvem.',
    'Sem telemetria.',
  ],
  'privacy.lead':
    'O Tiana Tables roda na sua máquina, conectado aos seus bancos de dados.',
  'privacy.text':
    'As senhas das conexões são criptografadas pelo chaveiro do sistema. Quando não há nenhum, o aplicativo avisa que as senhas estão apenas ofuscadas, em vez de fingir o contrário.',

  'databases.title': 'Bancos de dados',
  'databases.meta': 'o escopo',
  'databases.ssl': 'SSL, obrigatório ou verificado',
  'databases.ssh': 'Túnel SSH',
  'databases.others': 'Outros SGBDs SQL',
  'databases.admin': 'Administração de servidores e usuários',
  'databases.supported': 'suportado',
  'databases.outOfScope': 'fora do escopo',
  'databases.text':
    'Uma conexão PostgreSQL abre um banco de dados e lista os schemas dele onde um servidor MySQL lista os bancos de dados. Outro SGBD próximo o bastante do padrão SQL pode ser discutido em uma issue.',

  'charts.title': 'Gráficos',
  'charts.meta': 'barras ou linhas, a partir de qualquer resultado',
  'charts.lead':
    'Qualquer resultado de uma consulta SQL com uma coluna numérica vira um gráfico de barras ou de linhas. Você escolhe o eixo X e as séries.',
  'charts.quote':
    'Um resultado com <code>LIMIT</code> é recusado de propósito: o gráfico de um resultado parcial mente.',
  'charts.text':
    'Copie como imagem, ou salve como PNG para aquele slide que pediram para você.',
  'charts.label':
    'Leituras mensais e leitores identificados, de janeiro de 2024 a setembro de 2026, ambos em alta',

  'themes.title': 'Temas',
  'themes.meta': '{count, number} paletas base16 · T para passar à próxima',
  'themes.lead':
    'Do Dracula ao Solarized, claros e escuros. O tema vale para o aplicativo inteiro, grade e editor SQL incluídos. Esta página usa as mesmas paletas: escolha uma.',

  'ssh.title': 'Túnel SSH',
  'ssh.meta': 'desde a v1.24.0',
  'ssh.lead':
    'Acesse um banco de dados atrás de um servidor SSH, do jeito que o seu terminal faz.',
  'ssh.items': [
    'O túnel executa o comando <code>ssh</code> da sua máquina: valem o seu <code>~/.ssh/config</code>, o seu <code>known_hosts</code> e o seu agente SSH.',
    'Deixe o usuário SSH vazio e ele vem da sua config.',
    'O que o ssh pergunta, o aplicativo pergunta: um servidor desconhecido mostra a impressão digital dele antes que você confie nele, e a frase secreta é pedida quando uma chave precisa de uma.',
    'O host e a porta do banco de dados são os que o servidor SSH enxerga.',
  ],
  'ssh.caption':
    'Valores de exemplo, no formulário e na pergunta que o aplicativo mostra.',

  'download.title': 'Download',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'Plataforma',
  'download.file': 'Arquivo',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': 'Baixar o .deb',
  'download.button.rpm': 'Baixar o .rpm',
  'download.button.macArm': 'Baixar para Apple silicon',
  'download.button.macIntel': 'Intel',
  'download.button.windowsSetup': 'Baixar para Windows',
  'download.note.linux':
    '.deb para Debian e Ubuntu, .rpm para Fedora e openSUSE',
  'download.note.macos':
    'Apple silicon a partir do M1, Intel para Macs mais antigos',
  'download.note.windows': 'Instalador para Windows 64 bits',
  'download.all':
    'Todas as versões, com as notas de lançamento, na <link>página de releases</link>.',
  'download.source': 'Ou compile a partir do código-fonte, com Node 26:',
  'download.contributing':
    'Contribuições são bem-vindas: veja o <link>CONTRIBUTING.md</link>.',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default ptBr;
