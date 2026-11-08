/**
 * Email clients append the previous thread under a quoted block. The dashboard should
 * show the new reply first and keep the history behind an explicit action.
 *
 * The markers below cover Gmail/Apple Mail ("On ... wrote:"), Outlook
 * ("-----Original Message-----" and the "From:/Sent:" block), and plain `>` quoting.
 */
export interface SplitEmailBody {
  main: string
  quoted: string | null
}

const MARKERS: RegExp[] = [
  /\n[ \t]*On [^\n]{0,200}wrote:[ \t]*\n/i,
  /\n[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/i,
  /\n[ \t]*_{10,}[ \t]*\n/,
  /\n[ \t]*From:[^\n]*\n(?:[ \t]*(?:Sent|Date|To|Subject):[^\n]*\n){1,4}/i,
  /(?:^|\n)[ \t]*>/,
]

export function splitQuotedText(value: string): SplitEmailBody {
  const text = (value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!text) return { main: '', quoted: null }

  let cut = -1
  for (const marker of MARKERS) {
    const match = marker.exec(text)
    if (match && (cut < 0 || match.index < cut)) cut = match.index
  }

  if (cut <= 0) return { main: text, quoted: null }

  const main = text.slice(0, cut).trim()
  const quoted = text.slice(cut).trim()
  if (quoted.length < 20 || main.length === 0) return { main: text, quoted: null }

  return { main, quoted }
}
