// The shell is separate from the plugin host. It follows the <html lang>
// that OpenCode sets when the interface language changes.
const languages = ["en", "es", "ru", "de", "fr", "pt", "uk", "ja", "zh"]
const labels = {
  start: ["Start", "Inicio", "Пуск", "Start", "Démarrer", "Iniciar", "Пуск", "スタート", "开始"],
  settings: ["Settings", "Configuración", "Настройки", "Einstellungen", "Paramètres", "Configurações", "Налаштування", "設定", "设置"],
  restoreTheme: ["Return to Windows 95", "Volver a Windows 95", "Вернуться в тему Windows 95", "Zu Windows 95 zurückkehren", "Revenir à Windows 95", "Voltar ao Windows 95", "Повернутися до Windows 95", "Windows 95 に戻す", "返回 Windows 95"],
  standard: ["Standard UI", "Interfaz estándar", "Обычный интерфейс", "Standardoberfläche", "Interface standard", "Interface padrão", "Стандартний інтерфейс", "標準 UI", "标准界面"],
  switchStandard: ["Switch to standard OpenCode UI", "Volver a la interfaz estándar de OpenCode", "Переключиться на обычный интерфейс OpenCode", "Zur Standardoberfläche von OpenCode wechseln", "Revenir à l’interface standard d’OpenCode", "Voltar à interface padrão do OpenCode", "Перейти до стандартного інтерфейсу OpenCode", "OpenCode の標準 UI に切り替える", "切换到 OpenCode 标准界面"],
  minimize: ["Minimize", "Minimizar", "Свернуть", "Minimieren", "Réduire", "Minimizar", "Згорнути", "最小化", "最小化"],
  maximize: ["Maximize / Restore", "Maximizar / Restaurar", "Развернуть / Восстановить", "Maximieren / Wiederherstellen", "Agrandir / Restaurer", "Maximizar / Restaurar", "Розгорнути / Відновити", "最大化 / 元に戻す", "最大化 / 还原"],
  close: ["Close", "Cerrar", "Закрыть", "Schließen", "Fermer", "Fechar", "Закрити", "閉じる", "关闭"],
  hideWindow: ["Minimize (Shift+click to shut down)", "Minimizar (Mayús+clic para apagar)", "Свернуть (Shift+клик — завершение работы)", "Minimieren (Umschalt+Klick zum Beenden)", "Réduire (Maj+clic pour arrêter)", "Minimizar (Shift+clique para desligar)", "Згорнути (Shift+клік — завершити роботу)", "最小化（Shift+クリックで終了）", "最小化（Shift+单击退出）"],
  ready: ["Ready", "Listo", "Готово", "Bereit", "Prêt", "Pronto", "Готово", "準備完了", "就绪"],
  soundOn: ["Win95 sounds: On", "Sonidos de Win95: activados", "Звуки Win95: включены", "Win95-Sounds: Ein", "Sons Win95 : activés", "Sons do Win95: ativados", "Звуки Win95: увімкнено", "Win95 サウンド：オン", "Win95 声音：开"],
  soundOff: ["Win95 sounds: Off", "Sonidos de Win95: desactivados", "Звуки Win95: выключены", "Win95-Sounds: Aus", "Sons Win95 : désactivés", "Sons do Win95: desativados", "Звуки Win95: вимкнено", "Win95 サウンド：オフ", "Win95 声音：关"],
  clockFormat: ["Switch between 24- and 12-hour time", "Cambiar entre 24 y 12 horas", "Переключить формат 24 / 12 часов", "Zwischen 24- und 12-Stunden-Format wechseln", "Basculer entre les formats 24 h et 12 h", "Alternar entre os formatos de 24 e 12 horas", "Змінити формат 24 / 12 годин", "24 時間表示と 12 時間表示を切り替える", "切换 24 / 12 小时制"],
  display: ["Display Properties", "Propiedades de pantalla", "Свойства экрана", "Eigenschaften von Anzeige", "Propriétés d’affichage", "Propriedades de vídeo", "Властивості екрана", "画面のプロパティ", "显示属性"],
  wallpaper: ["Desktop wallpaper", "Fondo de escritorio", "Обои рабочего стола", "Desktophintergrund", "Fond d’écran", "Papel de parede", "Шпалери стільниці", "デスクトップの壁紙", "桌面壁纸"],
  teal: ["Teal (classic)", "Verde azulado (clásico)", "Бирюзовый (классика)", "Blaugrün (klassisch)", "Sarcelle (classique)", "Verde-azulado (clássico)", "Бірюзовий (класика)", "青緑（クラシック）", "经典蓝绿色"],
  woven: ["Woven Gold", "Trenzado dorado", "Плетёное золото", "Goldgeflecht", "Tressage doré", "Trama dourada", "Золоте плетіння", "金色の織り模様", "金色编织"],
  clouds: ["Clouds", "Nubes", "Облака", "Wolken", "Nuages", "Nuvens", "Хмари", "雲", "云朵"],
  bricks: ["Red Bricks", "Ladrillos rojos", "Красный кирпич", "Rote Ziegel", "Briques rouges", "Tijolos vermelhos", "Червона цегла", "赤レンガ", "红砖"],
  tartan: ["Tartan Plaid", "Cuadros escoceses", "Шотландка", "Schottenkaro", "Tartan", "Xadrez escocês", "Шотландська клітинка", "タータンチェック", "苏格兰格纹"],
  steel: ["Blue Rivets", "Remaches azules", "Синяя сталь", "Blaue Nieten", "Rivets bleus", "Rebites azuis", "Синя сталь", "青いリベット", "蓝色铆钉"],
  forest: ["Forest", "Bosque", "Лес", "Wald", "Forêt", "Floresta", "Ліс", "森", "森林"],
  midnight: ["Starfield", "Campo de estrellas", "Звёздное небо", "Sternenfeld", "Champ d’étoiles", "Campo de estrelas", "Зоряне небо", "星空", "星空"],
  appearance: ["Appearance", "Apariencia", "Оформление", "Darstellung", "Apparence", "Aparência", "Оформлення", "デザイン", "外观"],
  colors: ["Windows 95 color scheme", "Combinación de colores de Windows 95", "Цветовая схема Windows 95", "Windows-95-Farbschema", "Palette de couleurs Windows 95", "Esquema de cores do Windows 95", "Колірна схема Windows 95", "Windows 95 の配色", "Windows 95 配色"],
  layout: ["OpenCode window layout", "Disposición de la ventana de OpenCode", "Расположение окна OpenCode", "OpenCode-Fensterlayout", "Disposition de la fenêtre OpenCode", "Layout da janela do OpenCode", "Розташування вікна OpenCode", "OpenCode ウィンドウの配置", "OpenCode 窗口布局"],
  floating: ["Floating window", "Ventana flotante", "Плавающее окно", "Schwebendes Fenster", "Fenêtre flottante", "Janela flutuante", "Плаваюче вікно", "フローティングウィンドウ", "浮动窗口"],
  fillDesktop: ["Fill the desktop", "Ocupar el escritorio", "Развернуть на весь рабочий стол", "Desktop ausfüllen", "Remplir le bureau", "Preencher a área de trabalho", "На всю стільницю", "デスクトップ全体に表示", "铺满桌面"],
  effects: ["Sounds & Cursor", "Sonidos y cursor", "Звуки и курсор", "Sounds und Mauszeiger", "Sons et curseur", "Sons e cursor", "Звуки й курсор", "サウンドとカーソル", "声音和光标"],
  sounds: ["Play Windows 95 sounds", "Activar los sonidos de Windows 95", "Включить звуки Windows 95", "Windows-95-Sounds abspielen", "Activer les sons de Windows 95", "Ativar os sons do Windows 95", "Увімкнути звуки Windows 95", "Windows 95 のサウンドを鳴らす", "播放 Windows 95 声音"],
  pixelCursor: ["Use Windows 95 cursors", "Usar los cursores de Windows 95", "Включить курсоры Windows 95", "Windows-95-Mauszeiger verwenden", "Utiliser les curseurs Windows 95", "Usar os cursores do Windows 95", "Увімкнути курсори Windows 95", "Windows 95 のカーソルを使う", "使用 Windows 95 光标"],
  showWelcome: ["Show the welcome window at startup", "Mostrar la bienvenida al iniciar", "Показывать окно приветствия при запуске", "Willkommensfenster beim Start anzeigen", "Afficher l’accueil au démarrage", "Mostrar a janela de boas-vindas ao iniciar", "Показувати привітання під час запуску", "起動時にようこそ画面を表示する", "启动时显示欢迎窗口"],
  soundTest: ["Test system sounds", "Probar sonidos del sistema", "Тест системных звуков", "Systemklänge testen", "Tester les sons système", "Testar sons do sistema", "Перевірити системні звуки", "システム音を試す", "测试系统声音"],
  uiMode: ["Interface mode", "Modo de interfaz", "Режим интерфейса", "Oberflächenmodus", "Mode d’interface", "Modo da interface", "Режим інтерфейсу", "インターフェースモード", "界面模式"],
  modeHint: ["You can switch back without restarting. Use the Win95 button to return.", "Puedes cambiar sin reiniciar. Usa el botón Win95 para volver.", "Перезапуск не нужен. Кнопка Win95 вернёт тему.", "Kein Neustart nötig. Mit der Win95-Schaltfläche wechselst du zurück.", "Pas besoin de redémarrer. Le bouton Win95 permet de revenir.", "Não é preciso reiniciar. Use o botão Win95 para voltar.", "Перезапуск не потрібен. Кнопка Win95 повертає тему.", "再起動は不要です。Win95 ボタンで元に戻せます。", "无需重启。点击 Win95 按钮即可返回。"],
  themeFiles: ["Theme files and recovery", "Archivos del tema y restauración", "Файлы темы и откат", "Designdateien und Wiederherstellung", "Fichiers du thème et restauration", "Arquivos do tema e restauração", "Файли теми й відновлення", "テーマのファイルと復元", "主题文件和恢复"],
  themeFolder: ["Theme folder:", "Carpeta del tema:", "Папка темы:", "Designordner:", "Dossier du thème :", "Pasta do tema:", "Папка теми:", "テーマのフォルダー：", "主题文件夹："],
  restore: ["Restore:", "Restaurar:", "Откат оригинала:", "Wiederherstellen:", "Restaurer :", "Restaurar:", "Відновлення:", "復元：", "还原："],
}

export function shellText(locale, key) {
  const lang = locale.toLowerCase().split("-")[0]
  const index = languages.indexOf(lang)
  const translated = Object.hasOwn(labels, key) ? labels[key] : []
  return translated[index] ?? translated[0] ?? key
}
