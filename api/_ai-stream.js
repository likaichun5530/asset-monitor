export function createSseDataParser(onData) {
  let buffer = ''

  function processLine(rawLine) {
    const line = String(rawLine || '').trim()
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return
    try {
      onData(JSON.parse(data))
    } catch {
      // 非法 JSON 或结束时仍是半包的数据安全忽略。
    }
  }

  return {
    push(chunk) {
      buffer += String(chunk || '')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      lines.forEach(processLine)
    },
    finish(chunk = '') {
      buffer += String(chunk || '')
      if (buffer) processLine(buffer)
      buffer = ''
    },
  }
}

export async function readStreamWithDeadline(reader, timeoutMs, onChunk) {
  const deadline = Date.now() + timeoutMs
  while (true) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      await reader.cancel('stream timeout').catch(() => {})
      throw Object.assign(new Error('AI 回答生成超时，请稍后重试'), { statusCode: 504, code: 'AI_STREAM_TIMEOUT' })
    }
    let timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(Object.assign(new Error('AI 回答生成超时，请稍后重试'), {
        statusCode: 504,
        code: 'AI_STREAM_TIMEOUT',
      })), remaining)
    })
    let result
    try {
      result = await Promise.race([reader.read(), timeoutPromise])
    } catch (error) {
      await reader.cancel('stream timeout').catch(() => {})
      throw error
    } finally {
      clearTimeout(timeout)
    }
    if (result.done) return
    onChunk(result.value)
  }
}
