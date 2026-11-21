import { expect, test } from "bun:test"
import { formatters, messages } from "../src/i18n"

test("every Clippy locale has all the English keys and interpolation parameters", () => {
  const keyPattern = /\{\{\w+\}\}/g
  const keys = Object.keys(messages.en).sort() as (keyof typeof messages.en)[]
  for (const dictionary of Object.values(messages)) {
    expect(Object.keys(dictionary).sort()).toEqual(keys)
    for (const key of keys)
      expect(dictionary[key].match(keyPattern)?.sort()).toEqual(messages.en[key].match(keyPattern)?.sort())
  }
  expect(messages.es.done).toBe("¡Listo!")
  expect(messages["pt-BR"]).toBe(messages.pt)
  expect(messages["zh-Hans"]).toBe(messages.zh)
})

test("formatters use the interface locale and round remaining time conservatively below one minute", () => {
  const english = formatters("en-US")
  const russian = formatters("ru-RU")
  expect(english.eta(21)).toBe("≈ 25 sec")
  expect(english.eta(59)).toBe("≈ 1 min")
  expect(russian.eta(90)).toMatch(/^≈ 2\s+мин$/u)
  expect(english.percent(50)).toBe("50%")
  expect(formatters("fr-FR").percent(50)).toMatch(/^50\s+%$/u)
})
