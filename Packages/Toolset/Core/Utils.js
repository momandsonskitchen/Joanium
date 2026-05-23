export function withTimeout(promise, timeoutMs, message) {
  let timer = null;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function summarizeToolDefinitions(tools = []) {
  return tools.map((tool) => ({
    name: tool.name,
    category: tool.category ?? 'built-in',
    parameters: Object.keys(tool.parameters ?? {}),
  }));
}
