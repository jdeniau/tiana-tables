import { SiteMessages } from './type';

const es: SiteMessages = {
  'meta.title': 'Tiana Tables: un cliente SQL para quienes programan',
  'meta.description':
    'Un cliente MySQL, MariaDB y PostgreSQL para quienes programan, en Linux, macOS y Windows. Explora, consulta y edita tus datos con eficiencia. Fácil de usar y bonito.',
  'nav.label': 'Secciones',
  'nav.editor': 'Editor',
  'nav.browse': 'Explorar',
  'nav.keyboard': 'Teclado',
  'nav.privacy': 'Privacidad',
  'nav.charts': 'Gráficos',
  'nav.themes': 'Temas',
  'nav.ssh': 'SSH',
  'nav.download': 'Descargar',
  'language.current': 'Idioma: {name}',
  'language.offer': 'Este sitio está disponible en español',
  'theme.label': 'Tema',
  'theme.system': 'Tema del sistema',
  'theme.dark': 'Oscuros',
  'theme.light': 'Claros',

  'hero.eyebrow': 'MySQL · MariaDB · PostgreSQL · Linux, macOS, Windows',
  'hero.title': 'Un cliente SQL para quienes programan',
  'hero.title.short': 'Un cliente SQL para devs',
  'hero.lead':
    'Explora, consulta y edita tus datos con eficiencia, sin soltar el teclado. Fácil de usar, bonito y multiplataforma.',
  'hero.download': 'Descargar',
  'hero.source': 'Código en GitHub',
  'hero.other': 'Otras plataformas',
  'spec.engines': 'Motores',
  'spec.engines.value': 'MySQL, MariaDB, PostgreSQL',
  'spec.runsOn': 'Sistemas',
  'spec.runsOn.value': 'Linux, macOS, Windows',
  'spec.connects': 'Conexión',
  'spec.connects.value': 'Directa, SSL o túnel SSH',
  'spec.themes': 'Temas',
  'spec.themes.value': '{count, number} temas',
  'spec.languages': 'Idiomas',
  'spec.languages.value': 'Inglés, francés',
  'spec.account': 'Cuenta',
  'spec.account.value': 'Ninguna. Sin telemetría',
  'spec.license': 'Licencia',
  'spec.latest': 'Versión',
  'app.label':
    'Tiana Tables mostrando la tabla article, filtrada por su estado',
  'app.caption':
    'Esta ventana es HTML, dibujada con la paleta elegida en la barra de título, como en la aplicación. Datos de ejemplo: «Le Fil», el conjunto de datos de desarrollo.',

  'editor.title': 'Editor SQL',
  'editor.meta': 'Monaco, el editor de VS Code',
  'editor.lead':
    'Conoce la gramática de tu motor y el esquema de tu base de datos, así que hace más que colorear palabras clave.',
  'editor.items': [
    'Completa tablas, columnas y alias. Después de <code>a.</code>, obtienes las columnas de esa tabla y nada más.',
    'Al completar una tabla en <code>FROM</code> o <code>JOIN</code>, escribe su alias, y la cláusula <code>ON</code> cuando una clave foránea la vincula con una tabla que ya está en la consulta.',
    'Solo sugiere las palabras clave válidas en la posición del cursor.',
    'Subraya los errores de sintaxis mientras escribes y avisa de columnas desconocidas como <code>u.emial</code>. Nunca en SQL válido.',
    'Ejecuta la sentencia bajo el cursor, o todas en orden, y se detiene en el primer error.',
  ],
  'editor.label':
    'Consulta SQL con la lista de autocompletado abierta después de a.',

  'browse.title': 'Explorar',
  'browse.meta': 'cuadrícula virtualizada, renderizado instantáneo',
  'browse.lead':
    'Una tabla muy ancha se desplaza sin tirones, y las filas siguientes están a un clic.',
  'browse.items': [
    'Filtra con una cláusula <code>WHERE</code>, recordada para cada tabla.',
    'Haz clic derecho en una celda para filtrar por su valor, por tu portapapeles o por lo que quieras.',
    'Las claves foráneas son enlaces: un clic te lleva a la fila referenciada.',
    'Copia los valores de las celdas en las que haces clic, o filas enteras como TSV, CSV, Markdown, JSON o <code>INSERT</code> de SQL.',
  ],

  'edit.title': 'Editar',
  'edit.meta': 'detección optimista de conflictos',
  'edit.lead':
    'Haz doble clic en una celda para abrir el editor del tipo de su columna.',
  'edit.editors.label': 'Editores de celda',
  'edit.editors': ['selector de fecha', 'ENUM / SET', 'JSON', 'texto'],
  'edit.text':
    'Si el valor cambió, o si la fila se eliminó, desde que la cargaste, tú eliges qué pasa. Nada se sobrescribe en silencio. Una celda en la que no se puede escribir dice por qué: sin clave primaria, columna generada, columna binaria.',

  'keyboard.title': 'Teclado',
  'keyboard.meta': 'los atajos principales',
  'keyboard.lead':
    'De una tabla a otra, de la cuadrícula al editor: tus manos pueden quedarse en el teclado.',
  'keyboard.text':
    'Las teclas siguen a VS Code y a tu navegador, y los menús y botones muestran las suyas, así que las aprendes sobre la marcha.',
  'keyboard.navigate': 'Ir a una tabla o a una base de datos',
  'keyboard.sqlPanel': 'Abrir el panel SQL',
  'keyboard.run': 'Ejecutar la sentencia bajo el cursor',
  'keyboard.move': 'Moverse de celda en celda',
  'keyboard.extend': 'Ampliar la selección',
  'keyboard.edit': 'Editar la celda',
  'keyboard.delete': 'Poner a NULL, o eliminar las filas',
  'keyboard.copy': 'Copiar las celdas o las filas',
  'keyboard.goToId': 'Ir a una fila por su id',
  'keyboard.escape.key': 'Esc',
  'keyboard.escape': 'Quitar la selección',
  'keyboard.connection': 'Conexión siguiente',
  'keyboard.history': 'Atrás, adelante',

  'privacy.title': 'Tu máquina',
  'privacy.meta': 'credenciales',
  'privacy.statement': [
    'Sin cuenta.',
    'Sin sincronización en la nube.',
    'Sin telemetría.',
  ],
  'privacy.lead':
    'Tiana Tables se ejecuta en tu máquina, conectado a tus bases de datos.',
  'privacy.text':
    'Las contraseñas de las conexiones se cifran con el llavero del sistema. Si no hay ninguno, la aplicación te avisa de que las contraseñas solo están ofuscadas, en lugar de fingir lo contrario.',

  'databases.title': 'Bases de datos',
  'databases.meta': 'el alcance',
  'databases.ssl': 'SSL, requerido o verificado',
  'databases.ssh': 'Túnel SSH',
  'databases.others': 'Otros motores SQL',
  'databases.admin': 'Administración de servidores y usuarios',
  'databases.supported': 'compatible',
  'databases.outOfScope': 'fuera de alcance',
  'databases.text':
    'Una conexión PostgreSQL abre una base de datos y lista sus esquemas donde un servidor MySQL lista sus bases de datos. Otro motor que comparta lo suficiente del estándar SQL se puede discutir en un issue.',

  'charts.title': 'Gráficos',
  'charts.meta': 'barras o líneas, desde cualquier resultado',
  'charts.lead':
    'Cualquier resultado de una consulta SQL con una columna numérica se convierte en un gráfico de barras o de líneas. Tú eliges el eje X y las series.',
  'charts.quote':
    'Un resultado con <code>LIMIT</code> se rechaza a propósito: el gráfico de un resultado parcial miente.',
  'charts.text':
    'Cópialo como imagen, o guárdalo como PNG para la diapositiva que te pidieron.',
  'charts.label':
    'Lecturas mensuales y lectores identificados, de enero de 2024 a septiembre de 2026, ambos en aumento',

  'themes.title': 'Temas',
  'themes.meta': '{count, number} paletas base16 · T para pasar a la siguiente',
  'themes.lead':
    'De Dracula a Solarized, claros y oscuros. El tema se aplica a toda la aplicación, cuadrícula y editor SQL incluidos. Esta página usa las mismas paletas: elige una.',

  'ssh.title': 'Túnel SSH',
  'ssh.meta': 'desde la v1.24.0',
  'ssh.lead':
    'Accede a una base de datos detrás de un servidor SSH, como lo hace tu terminal.',
  'ssh.items': [
    'El túnel ejecuta el comando <code>ssh</code> de tu máquina: se aplican tu <code>~/.ssh/config</code>, tus <code>known_hosts</code> y tu agente SSH.',
    'Deja vacío el usuario SSH y se toma de tu config.',
    'Lo que ssh pregunta, la aplicación lo pregunta: un servidor desconocido muestra su huella antes de que confíes en él, y se pide la frase de contraseña cuando una clave la necesita.',
    'El host y el puerto de la base de datos son los que ve el servidor SSH.',
  ],
  'ssh.caption':
    'Valores de ejemplo, en el formulario y en la pregunta que muestra la aplicación.',

  'download.title': 'Descargar',
  'download.meta': 'v{version} · MIT',
  'download.platform': 'Plataforma',
  'download.file': 'Archivo',
  'download.row.deb': 'Linux · Debian, Ubuntu',
  'download.row.rpm': 'Linux · Fedora, openSUSE',
  'download.row.macArm': 'macOS · Apple silicon',
  'download.row.macIntel': 'macOS · Intel',
  'download.row.windowsSetup': 'Windows',
  'download.button.deb': 'Descargar el .deb',
  'download.button.rpm': 'Descargar el .rpm',
  'download.button.macArm': 'Descargar para Apple silicon',
  'download.button.macIntel': 'Intel',
  'download.button.windowsSetup': 'Descargar para Windows',
  'download.note.linux':
    '.deb para Debian y Ubuntu, .rpm para Fedora y openSUSE',
  'download.note.macos':
    'Apple silicon para M1 y posteriores, Intel para Mac más antiguos',
  'download.note.windows': 'Instalador para Windows de 64 bits',
  'download.all':
    'Todas las versiones, con sus notas, en la <link>página de releases</link>.',
  'download.source': 'O compílalo desde el código fuente, con Node 26:',
  'download.contributing':
    'Las contribuciones son bienvenidas: consulta <link>CONTRIBUTING.md</link>.',

  'foot.credits': 'Tiana Tables · MIT · Julien Deniau',
  'foot.issues': 'Issues',
  'foot.releases': 'Releases',
};

export default es;
