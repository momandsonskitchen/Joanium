import { invokeIpc, onIpc } from '../../Shared/Ipc/RendererIpc.js';
import { EVENTS, dispatchEvent } from '../../Shared/Events/RendererEvents.js';

export function createCleanupGateway() {
  let started = false;
  let dispose = null;

  async function processRequest({ id, prompt, modeInstruction, label }) {
    if (label) {
      dispatchEvent(EVENTS.MEMORY_SYNC, { active: true, message: label });
    }

    try {
      const result = await invokeIpc('chat:complete-message', {
        messages: [{ role: 'user', content: prompt }],
        modeInstruction: modeInstruction || null,
        isNewSession: false,
      });

      await invokeIpc('memory:cleanup-ai-reply', id, {
        text: result?.text ?? '',
        thinking: result?.thinking ?? '',
        providerId: result?.providerId ?? null,
        modelId: result?.modelId ?? null,
        charCountIn: result?.charCountIn ?? 0,
        charCountOut: result?.charCountOut ?? 0,
      });
    } catch (error) {
      await invokeIpc('memory:cleanup-ai-reply', id, {
        error: error?.message ?? String(error),
      }).catch(() => {});
    } finally {
      if (label) {
        dispatchEvent(EVENTS.MEMORY_SYNC, { active: false });
      }
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      dispose = onIpc('memory:cleanup-ai-request', (payload) => {
        void processRequest(payload);
      });

      // Notify main process that the renderer listener is ready
      invokeIpc('memory:cleanup-renderer-ready').catch(() => {});
    },

    stop() {
      dispose?.();
      dispose = null;
      started = false;
    },
  };
}
