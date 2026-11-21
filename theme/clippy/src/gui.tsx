import { Command, Plugin, Slot, Style, type Context, type DialogHandle, type MountedSession } from "@opencode/plugin/gui"
import { createEffect, createMemo, createSignal, createUniqueId, on, onCleanup, Show, type Accessor } from "solid-js"
import css from "./clippy.css?inline"
import { observeCompletionSound } from "./completion"
import { formatters, messages } from "./i18n"
import { remainingSeconds } from "./progress"
import { canAnswer, Question } from "./question"
import { Clippy, heartbeatMs } from "./rpc"
import { readTurn, type Mode } from "./session-view"

function Mascot(props: { mode: Mode; name: string }) {
  const media = "win95://theme/clippy/media/"
  const clip = () => props.mode === "stopped" ? "still" : props.mode
  const [missing, setMissing] = createSignal(false)
  return (
    <>
      <picture aria-hidden="true" classList={{ "clippy95-media-missing": missing() }}>
        <source media="(prefers-reduced-motion: reduce)" srcset={`${media}still.webp`} />
        <img src={`${media}${clip()}.webp`} alt="" width="88" height="66" draggable={false}
          onLoad={() => setMissing(false)} onError={() => setMissing(true)} />
      </picture>
      <Show when={missing()}><span class="clippy95-fallback" aria-hidden="true">{props.name}</span></Show>
    </>
  )
}

function Dock(props: { ctx: Context; session: MountedSession; compact: Accessor<boolean>; toggle: () => void }) {
  const t = props.ctx.t
  const number = createMemo(() => formatters(props.ctx.locale.locale()))
  const panelID = createUniqueId()
  let mascot: HTMLButtonElement | undefined
  const store = () => props.session.server.data.session
  const id = () => props.session.id
  const running = () => store().status(id()) === "running"
  const form = () => store().form.list(id(), props.session.location)?.[0]
  const turn = createMemo(() => readTurn(store().message.list(id()), running()))
  const mode = (): Mode => {
    if (form()) return "ask"
    if (running()) return turn().report?.phase ?? turn().phase ?? "plan"
    if (turn().outcome === "succeeded") return "done"
    if (turn().outcome) return "stopped"
    return "idle"
  }
  const percent = () => mode() === "done" ? 100 : running() && !form() ? turn().report?.percent : undefined
  const progressLabel = () => {
    const value = percent()
    return value === undefined ? "—" : number().percent(value)
  }
  const [now, setNow] = createSignal(Date.now())
  createEffect(() => {
    if (!running() || form() || props.compact()) return
    const { report, reportedAt } = turn()
    const latest = Math.max(report?.stepEtaSeconds ?? 0, report?.etaSeconds ?? 0)
    const current = Date.now()
    setNow(current)
    if (!latest || remainingSeconds(latest, reportedAt, current) === undefined) return
    const timer = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (remainingSeconds(latest, reportedAt, time) === undefined) window.clearInterval(timer)
    }, 1000)
    onCleanup(() => window.clearInterval(timer))
  })
  const stepEta = () => remainingSeconds(turn().report?.stepEtaSeconds, turn().reportedAt, now())
  const totalEta = () => remainingSeconds(turn().report?.etaSeconds, turn().reportedAt, now())
  const status = () => {
    const current = mode()
    if (current === "ask") return form()?.title || t("waiting")
    if (current === "stopped") return t(turn().outcome === "failed" ? "failed" : "stopped")
    if (current === "done" || current === "idle") return t(current)
    return turn().report?.status ?? turn().publicStatus ?? t(current)
  }

  const stepLabel = () => {
    const time = stepEta()
    if (time !== undefined) return t("stepEta", { time: number().eta(time) })
    return t(turn().report?.stepEtaSeconds === undefined ? "stepUnknown" : "stepExpired")
  }

  let dialog: DialogHandle | undefined
  const close = () => { dialog?.close(); dialog = undefined }
  createEffect(on(() => form()?.id, close, { defer: true }))
  createEffect(on(() => running(), close, { defer: true }))
  onCleanup(close)

  function openQuestion() {
    const current = form()
    if (!current || !canAnswer(current)) return
    const source = store().form
    const sessionID = id()
    const location = current.location ?? props.session.location
    close()
    dialog = props.ctx.dialogs.open((handle) =>
      <Question ctx={props.ctx} dialog={handle} form={current}
        reply={(answer) => source.reply({ sessionID, formID: current.id, answer }, location)} />,
    )
  }

  function openResult() {
    const result = turn().result
    if (!result || running()) return
    close()
    dialog = props.ctx.dialogs.open((handle) =>
      <props.ctx.ui.Dialog title={t("resultTitle")} size="large">
        <div class="clippy95-dialog">
          <p class="clippy95-dialog-heading"><span aria-hidden="true">✓ </span>{t("done")}</p>
          <div class="clippy95-result"><props.ctx.ui.Markdown text={result} /></div>
          <div class="clippy95-actions"><button type="button" onClick={handle.close}>{t("close")}</button></div>
        </div>
      </props.ctx.ui.Dialog>,
    )
  }

  return (
    <aside class="clippy95-dock" data-mode={mode()} aria-label={t("assistant")} dir={props.ctx.locale.direction()}>
      <Show when={!props.compact()}>
        <div class="clippy95-note" id={panelID}>
          <div class="clippy95-title">
            <span>{t("name")}</span>
            <button type="button" class="clippy95-collapse" aria-label={t("collapse")} title={t("collapse")}
              onClick={() => { props.toggle(); mascot?.focus() }}
            ><span aria-hidden="true" /></button>
          </div>
          <div class="clippy95-body">
            <div class="clippy95-status-line">
              <span class="clippy95-led" aria-hidden="true" />
              <p class="clippy95-status" dir="auto" title={status()} role="status">{status()}</p>
            </div>
            <Show when={(!form() && running()) || mode() === "done"}>
              <div class="clippy95-meta">
                <div class="clippy95-progress" role="progressbar" aria-label={t("progress")} aria-valuenow={percent()}>
                  <span
                    classList={{ "clippy95-progress-unknown": percent() === undefined }}
                    style={percent() === undefined ? undefined : { width: `${percent()}%` }}
                  />
                </div>
                <span class="clippy95-numeral" aria-hidden="true">{progressLabel()}</span>
              </div>
            </Show>
            <Show when={running() && !form()}>
              <div class="clippy95-eta">
                <span>{stepLabel()}</span>
                <Show when={totalEta()}>{(seconds) => <span>{t("totalEta", { time: number().eta(seconds()) })}</span>}</Show>
              </div>
            </Show>
            <Show when={form()} keyed>{(current) =>
              canAnswer(current)
                ? <button type="button" onClick={openQuestion}>{t("answerOpen")}</button>
                : <small>{t("answerInChat")}</small>
            }</Show>
            <Show when={mode() === "done" && turn().result}>
              <button type="button" onClick={openResult}>{t("resultOpen")}</button>
            </Show>
          </div>
        </div>
      </Show>
      <button
        ref={mascot}
        class="clippy95-mascot"
        type="button"
        title={props.compact() ? t("compactTip", { status: status() }) : t("collapse")}
        aria-label={props.compact() ? t("expand", { status: status() }) : t("collapse")}
        aria-expanded={!props.compact()}
        aria-controls={props.compact() ? undefined : panelID}
        onClick={props.toggle}
      >
        <Mascot mode={mode()} name={t("name")} />
        <Show when={props.compact() && mode() !== "idle"}><span class="clippy95-led" aria-hidden="true" /></Show>
      </button>
    </aside>
  )
}

const compactKey = "win95-clippy.compact"

export default Plugin.define({
  i18n: messages,
  setup(ctx) {
    const themed = () => document.documentElement.dataset.win95 === "on"
    const [enabled, setEnabled] = createSignal(themed())
    const [compact, setCompact] = createSignal(false)
    try { setCompact(localStorage.getItem(compactKey) === "1") } catch { /* optional preference */ }
    const toggle = () => {
      setCompact((value) => !value)
      try { localStorage.setItem(compactKey, compact() ? "1" : "0") } catch { /* optional preference */ }
    }
    const observer = new MutationObserver(() => setEnabled(themed()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-win95"] })
    onCleanup(() => observer.disconnect())
    observeCompletionSound(ctx, enabled)

    createEffect(() => {
      if (!enabled() || compact()) return
      const session = ctx.sessions.current()
      if (!session?.server.builtin || !session.server.connected || session.pending || !session.location) return
      const api = session.server.client.rpc(Clippy)
      const location = session.location
      const ping = () => { void api.watch({ sessionID: session.id }, { location }).catch(() => undefined) }
      ping()
      const timer = window.setInterval(ping, heartbeatMs)
      onCleanup(() => window.clearInterval(timer))
    })

    ctx.add(Style, css)
    ctx.add(Command, () => ({
      id: "toggle",
      title: ctx.t(compact() ? "commandOpen" : "commandClose"),
      enabled: enabled() && !!ctx.sessions.current(),
      run: toggle,
    }))
    ctx.add(Slot, {
      at: "window.bottom",
      render: () =>
        <Show when={enabled() && ctx.sessions.current()} keyed>{(session) =>
          <Dock ctx={ctx} session={session} compact={compact} toggle={toggle} />
        }</Show>,
    })
  },
})
