export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)

  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

export function setPrivateResponseHeaders(res) {
  res.setHeader?.('Cache-Control', 'private, no-store')
  res.setHeader?.('Pragma', 'no-cache')
}
