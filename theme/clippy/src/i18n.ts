const en = {
  name: "Clippy", assistant: "Clippy assistant", collapse: "Minimize Clippy",
  expand: "Open Clippy: {{status}}", compactTip: "Clippy — {{status}}",
  commandOpen: "Clippy: Open", commandClose: "Clippy: Minimize",
  waiting: "I need your answer.", done: "All done!", failed: "The task ended with an error.",
  stopped: "The task was stopped.", idle: "Ready to help.",
  plan: "Getting started…", read: "Reading…", edit: "Making changes…", check: "Checking the result…", wrap: "Preparing the reply…",
  progress: "Task progress", stepEta: "Step: {{time}}", totalEta: "Task: {{time}}",
  stepUnknown: "Step: no estimate yet", stepExpired: "Step: estimate expired",
  answerOpen: "Answer…", answerInChat: "Answer the form in the chat.",
  resultOpen: "View result…", resultTitle: "Clippy — Result", questionTitle: "Clippy — Question",
  close: "Close", choose: "Choose an answer…", custom: "Your own answer…", customField: "{{field}}: your own answer",
  yes: "Yes", no: "No", answerCount: "Check how many answers you chose for “{{field}}”.",
  replyError: "Couldn't send the answer. Try again or answer in the chat.",
  later: "Later", sending: "Sending…", answer: "Answer",
}

type Messages = Record<keyof typeof en, string>
const ru: Messages = {
  name: "Скрепочка", assistant: "Помощник Скрепочка", collapse: "Свернуть Скрепочку",
  expand: "Развернуть Скрепочку: {{status}}", compactTip: "Скрепочка — {{status}}",
  commandOpen: "Скрепочка: развернуть", commandClose: "Скрепочка: свернуть",
  waiting: "Нужен ваш ответ.", done: "Готово!", failed: "Работа завершилась с ошибкой.",
  stopped: "Работа остановлена.", idle: "Готова помочь с задачей.",
  plan: "Знакомлюсь с задачей…", read: "Изучаю материалы…", edit: "Вношу изменения…", check: "Проверяю результат…", wrap: "Готовлю ответ…",
  progress: "Прогресс задачи", stepEta: "Шаг: {{time}}", totalEta: "До конца: {{time}}",
  stepUnknown: "Шаг: время пока неизвестно", stepExpired: "Шаг: оценка истекла",
  answerOpen: "Ответить…", answerInChat: "Ответьте на форму в чате.",
  resultOpen: "Открыть результат…", resultTitle: "Скрепочка — результат", questionTitle: "Скрепочка — вопрос",
  close: "Закрыть", choose: "Выберите ответ…", custom: "Свой вариант…", customField: "{{field}}: свой вариант",
  yes: "Да", no: "Нет", answerCount: "Проверьте количество ответов в поле «{{field}}».",
  replyError: "Не удалось отправить ответ. Попробуйте ещё раз или ответьте в чате.",
  later: "Позже", sending: "Отправляю…", answer: "Ответить",
}
const es: Messages = {
  name: "Clippo", assistant: "Asistente Clippo", collapse: "Minimizar Clippo",
  expand: "Abrir Clippo: {{status}}", compactTip: "Clippo — {{status}}",
  commandOpen: "Clippo: abrir", commandClose: "Clippo: minimizar",
  waiting: "Necesito tu respuesta.", done: "¡Listo!", failed: "La tarea terminó con un error.",
  stopped: "Se detuvo la tarea.", idle: "Listo para ayudarte.",
  plan: "Preparando la tarea…", read: "Leyendo…", edit: "Aplicando cambios…", check: "Comprobando el resultado…", wrap: "Preparando la respuesta…",
  progress: "Progreso de la tarea", stepEta: "Paso: {{time}}", totalEta: "Total: {{time}}",
  stepUnknown: "Paso: aún sin estimación", stepExpired: "Paso: se agotó el tiempo estimado",
  answerOpen: "Responder…", answerInChat: "Responde al formulario en el chat.",
  resultOpen: "Ver resultado…", resultTitle: "Clippo — Resultado", questionTitle: "Clippo — Pregunta",
  close: "Cerrar", choose: "Elige una respuesta…", custom: "Tu propia respuesta…", customField: "{{field}}: tu propia respuesta",
  yes: "Sí", no: "No", answerCount: "Revisa cuántas respuestas has elegido en «{{field}}».",
  replyError: "No se pudo enviar la respuesta. Vuelve a intentarlo o responde en el chat.",
  later: "Más tarde", sending: "Enviando…", answer: "Responder",
}
const de: Messages = {
  name: "Karl Klammer", assistant: "Assistent Karl Klammer", collapse: "Karl Klammer minimieren",
  expand: "Karl Klammer öffnen: {{status}}", compactTip: "Karl Klammer — {{status}}",
  commandOpen: "Karl Klammer: öffnen", commandClose: "Karl Klammer: minimieren",
  waiting: "Ich brauche deine Antwort.", done: "Fertig!", failed: "Die Aufgabe wurde mit einem Fehler beendet.",
  stopped: "Die Aufgabe wurde abgebrochen.", idle: "Bereit zu helfen.",
  plan: "Bereite die Aufgabe vor…", read: "Lese…", edit: "Nehme Änderungen vor…", check: "Prüfe das Ergebnis…", wrap: "Bereite die Antwort vor…",
  progress: "Aufgabenfortschritt", stepEta: "Schritt: {{time}}", totalEta: "Gesamt: {{time}}",
  stepUnknown: "Schritt: noch keine Schätzung", stepExpired: "Schritt: geschätzte Zeit abgelaufen",
  answerOpen: "Antworten…", answerInChat: "Bitte beantworte das Formular im Chat.",
  resultOpen: "Ergebnis ansehen…", resultTitle: "Karl Klammer — Ergebnis", questionTitle: "Karl Klammer — Frage",
  close: "Schließen", choose: "Antwort auswählen…", custom: "Eigene Antwort…", customField: "{{field}}: eigene Antwort",
  yes: "Ja", no: "Nein", answerCount: "Prüfe die Anzahl der Antworten unter „{{field}}“.",
  replyError: "Die Antwort wurde nicht gesendet. Versuche es erneut oder antworte im Chat.",
  later: "Später", sending: "Wird gesendet…", answer: "Antworten",
}
const fr: Messages = {
  name: "Clippy", assistant: "Assistant Clippy", collapse: "Réduire Clippy",
  expand: "Ouvrir Clippy : {{status}}", compactTip: "Clippy — {{status}}",
  commandOpen: "Clippy : ouvrir", commandClose: "Clippy : réduire",
  waiting: "J’ai besoin de ta réponse.", done: "C’est terminé !", failed: "La tâche s’est terminée sur une erreur.",
  stopped: "La tâche a été interrompue.", idle: "Prêt à t’aider.",
  plan: "Préparation de la tâche…", read: "Lecture en cours…", edit: "Modifications en cours…", check: "Vérification du résultat…", wrap: "Préparation de la réponse…",
  progress: "Avancement de la tâche", stepEta: "Étape : {{time}}", totalEta: "Total : {{time}}",
  stepUnknown: "Étape : pas encore d’estimation", stepExpired: "Étape : temps estimé écoulé",
  answerOpen: "Répondre…", answerInChat: "Réponds au formulaire dans la conversation.",
  resultOpen: "Voir le résultat…", resultTitle: "Clippy — Résultat", questionTitle: "Clippy — Question",
  close: "Fermer", choose: "Choisis une réponse…", custom: "Ta propre réponse…", customField: "{{field}} : ta propre réponse",
  yes: "Oui", no: "Non", answerCount: "Vérifie le nombre de réponses dans « {{field}} ».",
  replyError: "Impossible d’envoyer la réponse. Réessaie ou réponds dans la conversation.",
  later: "Plus tard", sending: "Envoi en cours…", answer: "Répondre",
}
const pt: Messages = {
  name: "Clippy", assistant: "Assistente Clippy", collapse: "Minimizar o Clippy",
  expand: "Abrir o Clippy: {{status}}", compactTip: "Clippy — {{status}}",
  commandOpen: "Clippy: abrir", commandClose: "Clippy: minimizar",
  waiting: "Preciso da sua resposta.", done: "Pronto!", failed: "A tarefa terminou com um erro.",
  stopped: "A tarefa foi interrompida.", idle: "Pronto para ajudar.",
  plan: "Preparando a tarefa…", read: "Lendo…", edit: "Fazendo alterações…", check: "Verificando o resultado…", wrap: "Preparando a resposta…",
  progress: "Progresso da tarefa", stepEta: "Etapa: {{time}}", totalEta: "Total: {{time}}",
  stepUnknown: "Etapa: ainda sem estimativa", stepExpired: "Etapa: tempo estimado esgotado",
  answerOpen: "Responder…", answerInChat: "Responda ao formulário no chat.",
  resultOpen: "Ver resultado…", resultTitle: "Clippy — Resultado", questionTitle: "Clippy — Pergunta",
  close: "Fechar", choose: "Escolha uma resposta…", custom: "Sua própria resposta…", customField: "{{field}}: sua própria resposta",
  yes: "Sim", no: "Não", answerCount: "Confira quantas respostas foram marcadas em “{{field}}”.",
  replyError: "Não foi possível enviar a resposta. Tente novamente ou responda no chat.",
  later: "Mais tarde", sending: "Enviando…", answer: "Responder",
}
const uk: Messages = {
  name: "Скріпка", assistant: "Помічниця Скріпка", collapse: "Згорнути Скріпку",
  expand: "Розгорнути Скріпку: {{status}}", compactTip: "Скріпка — {{status}}",
  commandOpen: "Скріпка: розгорнути", commandClose: "Скріпка: згорнути",
  waiting: "Потрібна ваша відповідь.", done: "Готово!", failed: "Завдання завершилося з помилкою.",
  stopped: "Роботу зупинено.", idle: "Готова допомогти.",
  plan: "Знайомлюся із завданням…", read: "Читаю матеріали…", edit: "Вношу зміни…", check: "Перевіряю результат…", wrap: "Готую відповідь…",
  progress: "Перебіг завдання", stepEta: "Крок: {{time}}", totalEta: "До кінця: {{time}}",
  stepUnknown: "Крок: час поки невідомий", stepExpired: "Крок: орієнтовний час вичерпано",
  answerOpen: "Відповісти…", answerInChat: "Дайте відповідь у формі в чаті.",
  resultOpen: "Відкрити результат…", resultTitle: "Скріпка — результат", questionTitle: "Скріпка — запитання",
  close: "Закрити", choose: "Виберіть відповідь…", custom: "Власний варіант…", customField: "{{field}}: власний варіант",
  yes: "Так", no: "Ні", answerCount: "Перевірте кількість відповідей у полі «{{field}}».",
  replyError: "Не вдалося надіслати відповідь. Спробуйте ще раз або дайте відповідь у чаті.",
  later: "Пізніше", sending: "Надсилаю…", answer: "Відповісти",
}
const ja: Messages = {
  name: "クリッピー", assistant: "アシスタントのクリッピー", collapse: "クリッピーを最小化",
  expand: "クリッピーを開く：{{status}}", compactTip: "クリッピー — {{status}}",
  commandOpen: "クリッピーを開く", commandClose: "クリッピーを最小化",
  waiting: "回答を待っています。", done: "完了しました！", failed: "エラーが発生しました。",
  stopped: "タスクを中断しました。", idle: "お手伝いできます。",
  plan: "タスクを確認中…", read: "読み込み中…", edit: "変更を適用中…", check: "結果を確認中…", wrap: "回答を準備中…",
  progress: "タスクの進捗", stepEta: "この手順：{{time}}", totalEta: "完了まで：{{time}}",
  stepUnknown: "この手順：所要時間は未定", stepExpired: "この手順：見積もり時間を超過",
  answerOpen: "回答する…", answerInChat: "チャットのフォームから回答してください。",
  resultOpen: "結果を見る…", resultTitle: "クリッピー — 結果", questionTitle: "クリッピー — 質問",
  close: "閉じる", choose: "回答を選んでください…", custom: "自分で入力…", customField: "{{field}}：自由入力",
  yes: "はい", no: "いいえ", answerCount: "「{{field}}」で選んだ回答の数を確認してください。",
  replyError: "回答を送信できませんでした。もう一度試すか、チャットから回答してください。",
  later: "後で", sending: "送信中…", answer: "回答する",
}
const zh: Messages = {
  name: "大眼夹", assistant: "大眼夹助手", collapse: "最小化大眼夹",
  expand: "展开大眼夹：{{status}}", compactTip: "大眼夹 — {{status}}",
  commandOpen: "展开大眼夹", commandClose: "最小化大眼夹",
  waiting: "正在等待你的回答。", done: "完成了！", failed: "任务因出错而结束。",
  stopped: "任务已停止。", idle: "随时可以帮忙。",
  plan: "正在梳理任务…", read: "正在读取资料…", edit: "正在修改…", check: "正在检查结果…", wrap: "正在准备回复…",
  progress: "任务进度", stepEta: "本步骤：{{time}}", totalEta: "全部完成：{{time}}",
  stepUnknown: "本步骤：暂未估时", stepExpired: "本步骤：已超出预计时间",
  answerOpen: "回答…", answerInChat: "请在聊天中的表单里回答。",
  resultOpen: "查看结果…", resultTitle: "大眼夹 — 结果", questionTitle: "大眼夹 — 提问",
  close: "关闭", choose: "请选择答案…", custom: "自定义答案…", customField: "{{field}}：自定义答案",
  yes: "是", no: "否", answerCount: "请检查「{{field}}」中所选答案的数量。",
  replyError: "未能提交答案。请重试，或直接在聊天中回答。",
  later: "稍后", sending: "正在发送…", answer: "回答",
}

// OpenCode provides the translations reactively through ctx.t.
export const messages = { en, ru, es, de, fr, pt, "pt-BR": pt, br: pt, uk, ja, zh, "zh-Hans": zh, "zh-CN": zh }

export function formatters(locale: string) {
  const number = new Intl.NumberFormat(locale, { style: "percent" })
  const seconds = new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "short" })
  const minutes = new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "short" })
  return {
    percent: (value: number) => number.format(value / 100),
    eta: (value: number) => `≈ ${value <= 55 ? seconds.format(Math.ceil(value / 5) * 5) : minutes.format(Math.round(value / 60))}`,
  }
}
