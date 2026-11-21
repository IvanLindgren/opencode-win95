import assert from "node:assert/strict"
import test from "node:test"
import { shellText } from "../theme/win95-i18n.mjs"

test("shell supports the language tags OpenCode provides and falls back to English", () => {
  assert.equal(shellText("es-MX", "start"), "Inicio")
  assert.equal(shellText("ru-RU", "start"), "Пуск")
  assert.equal(shellText("pt-BR", "settings"), "Configurações")
  assert.equal(shellText("zh-Hans", "display"), "显示属性")
  assert.equal(shellText("ja-JP", "display"), "画面のプロパティ")
  assert.equal(shellText("it-IT", "display"), "Display Properties")
  assert.equal(shellText("", "start"), "Start")
  assert.equal(shellText("es", "constructor"), "constructor")
})
