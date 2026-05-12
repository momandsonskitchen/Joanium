const stripeStrings = {
  connector: {
    id: 'stripe',
    label: 'Stripe',
    description:
      'Account, balance, customers, charges, and payment intents through the Stripe API.',
    credentialLabel: 'Secret key',
    credentialPlaceholder: 'sk_live_... or sk_test_...',
    credentialKey: 'token',
    optional: false,
  },
  tools: [
    {
      name: 'stripe_get_account',
      description: 'Get Stripe account details.',
      category: 'stripe',
      parameters: {},
    },
    {
      name: 'stripe_get_balance',
      description: 'Get Stripe account balance.',
      category: 'stripe',
      parameters: {},
    },
    {
      name: 'stripe_list_customers',
      description: 'List Stripe customers.',
      category: 'stripe',
      parameters: {
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum customers, default 10, max 50.',
        },
      },
    },
    {
      name: 'stripe_list_charges',
      description: 'List Stripe charges.',
      category: 'stripe',
      parameters: {
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum charges, default 10, max 50.',
        },
      },
    },
    {
      name: 'stripe_get_charge',
      description: 'Get a Stripe charge.',
      category: 'stripe',
      parameters: {
        charge_id: { type: 'string', required: true, description: 'Stripe charge ID.' },
      },
    },
    {
      name: 'stripe_list_payment_intents',
      description: 'List Stripe payment intents.',
      category: 'stripe',
      parameters: {
        limit: {
          type: 'number',
          required: false,
          description: 'Maximum payment intents, default 10, max 50.',
        },
      },
    },
  ],
};

export default stripeStrings;
