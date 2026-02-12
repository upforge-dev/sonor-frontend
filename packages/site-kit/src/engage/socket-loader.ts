/**
 * Lazy socket.io loader — kept in a separate file so bundlers
 * (Turbopack, webpack) never pull socket.io-client into the main
 * engage chunk.  Only loaded when the user actually opens the chat.
 */
export async function createSocket(
  url: string,
  opts: Record<string, any>,
) {
  const { io } = await import(/* webpackChunkName: "socket-io" */ 'socket.io-client')
  return io(url, opts)
}
