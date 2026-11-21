import type { FormField, FormInfo, FormValue } from "@opencode/client/promise"
import type { Context, DialogHandle } from "@opencode/plugin/gui"
import { createSignal, For, Match, Show, Switch } from "solid-js"

export function canAnswer(form: FormInfo) {
  return form.fields.every((field) => field.type !== "external" && !field.hidden && !field.when?.length)
}

type AnswerField = Exclude<FormField, { type: "external" }>

function Field(props: { t: Context["t"]; field: AnswerField; change: (value: FormValue | undefined) => void }) {
  const field = props.field
  const title = field.title || field.key

  if (field.type === "string" && field.options?.length) {
    const options = field.options
    const [choice, setChoice] = createSignal(options.findIndex((option) => option.value === field.default))
    const [custom, setCustom] = createSignal("")
    return (
      <fieldset class="clippy95-field">
        <legend>{title}</legend>
        <Show when={field.description}><p>{field.description}</p></Show>
        <select
          aria-label={title}
          required={field.required}
          onChange={(event) => {
            const { value } = event.currentTarget
            const index = value === "" ? -1 : Number(value)
            setChoice(index)
            props.change(index === options.length ? custom() || undefined : options[index]?.value)
          }}
        >
          <option value="" selected={choice() < 0}>{props.t("choose")}</option>
          <For each={options}>{(option, index) => <option value={index()} selected={index() === choice()}>{option.label}</option>}</For>
          <Show when={field.custom}><option value={options.length}>{props.t("custom")}</option></Show>
        </select>
        <Show when={choice() >= 0 && options[choice()]?.description}><p>{options[choice()]?.description}</p></Show>
        <Show when={choice() === options.length}>
          <input
            type="text"
            aria-label={props.t("customField", { field: title })}
            value={custom()}
            required={field.required}
            onInput={(event) => {
              setCustom(event.currentTarget.value)
              props.change(custom() || undefined)
            }}
          />
        </Show>
      </fieldset>
    )
  }

  if (field.type === "multiselect") {
    const [selected, setSelected] = createSignal(field.default ?? [])
    const [custom, setCustom] = createSignal("")
    const update = () => {
      const values = [...new Set([...selected(), custom().trim()].filter(Boolean))]
      props.change(values.length ? values : undefined)
    }
    return (
      <fieldset class="clippy95-field">
        <legend>{title}</legend>
        <Show when={field.description}><p>{field.description}</p></Show>
        <For each={field.options}>{(option) =>
          <label class="clippy95-choice">
            <input
              type="checkbox"
              checked={selected().includes(option.value)}
              onChange={(event) => {
                setSelected((current) => event.currentTarget.checked
                  ? [...current, option.value]
                  : current.filter((value) => value !== option.value))
                update()
              }}
            />
            <span>{option.label}<Show when={option.description}><small>{option.description}</small></Show></span>
          </label>
        }</For>
        <Show when={field.custom}>
          <input type="text" aria-label={props.t("customField", { field: title })} placeholder={props.t("custom")}
            onInput={(event) => { setCustom(event.currentTarget.value); update() }} />
        </Show>
      </fieldset>
    )
  }

  return (
    <label class="clippy95-field">
      <strong>{title}</strong>
      <Show when={field.description}><span>{field.description}</span></Show>
      <Switch>
        <Match when={field.type === "boolean"}>
          <select
            required={field.required}
            onChange={(event) => {
              const value = event.currentTarget.value
              props.change(value ? value === "true" : undefined)
            }}
          >
            <option value="" selected={field.default === undefined}>{props.t("choose")}</option>
            <option value="true" selected={field.default === true}>{props.t("yes")}</option>
            <option value="false" selected={field.default === false}>{props.t("no")}</option>
          </select>
        </Match>
        <Match when={field.type === "number" || field.type === "integer"}>
          <input
            type="number"
            value={typeof field.default === "number" ? field.default : ""}
            min={"minimum" in field && typeof field.minimum === "number" ? field.minimum : undefined}
            max={"maximum" in field && typeof field.maximum === "number" ? field.maximum : undefined}
            step={field.type === "integer" ? 1 : "any"}
            required={field.required}
            onInput={(event) => props.change(event.currentTarget.value ? event.currentTarget.valueAsNumber : undefined)}
          />
        </Match>
        <Match when={field.type === "string" ? field : undefined} keyed>{(text) =>
          <input
            type={text.format === "email" ? "email" : text.format === "uri" ? "url" : text.format ?? "text"}
            value={text.default ?? ""}
            required={text.required}
            placeholder={text.placeholder}
            minLength={text.minLength}
            maxLength={text.maxLength}
            pattern={text.pattern}
            onInput={(event) => props.change(event.currentTarget.value || undefined)}
          />
        }</Match>
      </Switch>
    </label>
  )
}

export function Question(props: {
  ctx: Context
  dialog: DialogHandle
  form: FormInfo
  reply: (answer: Record<string, FormValue>) => Promise<void>
}) {
  const answer = new Map<string, FormValue>()
  for (const field of props.form.fields) {
    if ("default" in field && field.default !== undefined) answer.set(field.key, field.default)
  }
  const [sending, setSending] = createSignal(false)
  const [error, setError] = createSignal<{ field?: string }>()
  const t = props.ctx.t

  return (
    <props.ctx.ui.Dialog title={t("questionTitle")} size="fit">
      <form class="clippy95-dialog" onSubmit={async (event) => {
        event.preventDefault()
        if (sending()) return
        setError(undefined)
        for (const field of props.form.fields) {
          const count = (answer.get(field.key) as string[] | undefined)?.length ?? 0
          if (field.type === "multiselect" &&
            (count < Math.max(field.minItems ?? 0, field.required ? 1 : 0) || count > (field.maxItems ?? Infinity))) {
            setError({ field: field.title || field.key })
            return
          }
        }
        setSending(true)
        try {
          await props.reply(Object.fromEntries(answer))
          props.dialog.close()
        } catch {
          setError({})
        } finally {
          setSending(false)
        }
      }}>
        <p class="clippy95-dialog-heading" dir="auto">{props.form.title || t("waiting")}</p>
        <For each={props.form.fields}>{(field) =>
          <Show when={field.type !== "external" ? field : undefined} keyed>{(input) =>
            <Field t={t} field={input} change={(value) => {
              if (value === undefined) answer.delete(input.key)
              else answer.set(input.key, value)
            }} />
          }</Show>
        }</For>
        <Show when={error()} keyed>{({ field }) =>
          <p role="alert" class="clippy95-error">{field ? t("answerCount", { field }) : t("replyError")}</p>
        }</Show>
        <div class="clippy95-actions">
          <button type="button" onClick={() => props.dialog.close()}>{t("later")}</button>
          <button type="submit" disabled={sending()}>{t(sending() ? "sending" : "answer")}</button>
        </div>
      </form>
    </props.ctx.ui.Dialog>
  )
}
