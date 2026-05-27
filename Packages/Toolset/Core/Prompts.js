export const TOOLSET_PROMPTS = Object.freeze({
  disconnectedHint:
    'The user has not connected the following services: {services}. DO NOT attempt to call any ' +
    'tools for these services. They are currently disabled and will fail. Instead, politely ' +
    'inform the user that they need to connect the relevant service via Settings -> Connectors.',
  connectedHint:
    'The user has successfully connected the following services: {services}. You have full ' +
    'access to use their provided tools when the user asks for related work.',
});
