/**
 * 接続文字列の「秘密ではない部分」だけを取り出す。開発中に、アプリが実際に受け取った接続先を
 * 確認するための診断用。パスワードそのものは返さない(括弧の有無や文字数などの形だけ)。
 */
export function describeDatabaseUrl(raw: string | undefined) {
  if (!raw) return { set: false as const }
  try {
    const url = new URL(raw)
    const password = decodeURIComponent(url.password)
    return {
      set: true as const,
      scheme: url.protocol.replace(':', ''),
      user: decodeURIComponent(url.username),
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.slice(1),
      // 見本の [YOUR-PASSWORD] の括弧を残したままにする間違いの検出
      passwordHasBrackets: password.includes('[') || password.includes(']'),
      passwordIsEmpty: password === '',
      // 文字数と、英数字以外の数だけ(中身は出さない)。本来のパスワードと照らして、途中で欠けたり
      // 変わったりしていないか(例: Next.js が値の中の $名前 を変数として展開した)を確かめる
      passwordLength: password.length,
      passwordNonAlphanumeric: (password.match(/[^A-Za-z0-9]/g) ?? []).length,
    }
  } catch {
    // 記号を URL エンコードしていないなど、URL として解釈できない
    return { set: true as const, parsable: false as const }
  }
}
