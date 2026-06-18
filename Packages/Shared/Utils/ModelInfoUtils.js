export function hasModelInfo(model) {
  if (!model) return false;
  return Boolean(
    model.description ||
    model.context_window ||
    model.max_output ||
    model.pricing ||
    (model.inputs && Object.values(model.inputs).some(Boolean)) ||
    model.thinking,
  );
}

export function formatTokenCount(n) {
  const num =
    typeof n === 'object' && n !== null ? (n.context_length ?? n.max_output_tokens ?? null) : n;
  if (!num || num <= 0) return null;
  if (num >= 1_000_000) {
    const v = num / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
  return String(num);
}

export function resolveContextWindow(model) {
  if (typeof model.context_window === 'number') return model.context_window;
  if (typeof model.context_window === 'object' && model.context_window !== null)
    return model.context_window.context_length ?? null;
  return null;
}

export function resolveMaxOutput(model) {
  if (model.max_output) return model.max_output;
  if (typeof model.context_window === 'object' && model.context_window !== null)
    return model.context_window.max_output_tokens ?? null;
  return null;
}

export function formatPrice(dollars) {
  if (dollars === undefined || dollars === null) return null;
  if (dollars === 0) return 'Free';
  if (dollars < 0.001) return `$${dollars.toFixed(5)}`;
  if (dollars < 1) return `$${dollars.toFixed(3)}`;
  return `$${dollars.toFixed(2)}`;
}
