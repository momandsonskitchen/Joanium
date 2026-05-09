import {
  clampInteger,
  formatDate,
  formatList,
  requireConnectorCredentials,
  requireText
} from '../../../Core/ConnectorHttp.js';

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeRequest(rootDirectory, path, { searchParams = {} } = {}) {
  const credentials = await requireConnectorCredentials(rootDirectory, 'stripe', ['token'], 'Stripe');
  const url = new URL(`${STRIPE_API}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${credentials.token}`
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${data?.error?.message ?? 'Stripe request failed'}`);
  return data;
}

function money(amount, currency) {
  return `${(Number(amount ?? 0) / 100).toFixed(2)} ${String(currency ?? '').toUpperCase()}`;
}

export function createStripeToolHandlers({ rootDirectory }) {
  return {
    async stripe_get_account() {
      const account = await stripeRequest(rootDirectory, '/account');
      return [
        `Stripe account: ${account.id}`,
        `Business: ${account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? '(none)'}`,
        `Country: ${account.country}`,
        `Charges enabled: ${account.charges_enabled}`,
        `Payouts enabled: ${account.payouts_enabled}`
      ].join('\n');
    },

    async stripe_get_balance() {
      const balance = await stripeRequest(rootDirectory, '/balance');
      const rows = [
        ...(balance.available ?? []).map((item) => `Available: ${money(item.amount, item.currency)}`),
        ...(balance.pending ?? []).map((item) => `Pending: ${money(item.amount, item.currency)}`)
      ];
      return ['Stripe balance', '', ...rows].join('\n');
    },

    async stripe_list_customers(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await stripeRequest(rootDirectory, '/customers', { searchParams: { limit } });
      return formatList('Stripe customers', (data.data ?? []).map((customer, index) => `${index + 1}. ${customer.name || customer.email || customer.id}\n   Email: ${customer.email ?? '(none)'} | Created: ${formatDate(customer.created * 1000)}\n   ID: ${customer.id}`));
    },

    async stripe_list_charges(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await stripeRequest(rootDirectory, '/charges', { searchParams: { limit } });
      return formatList('Stripe charges', (data.data ?? []).map((charge, index) => `${index + 1}. ${charge.id}: ${money(charge.amount, charge.currency)}\n   Status: ${charge.status} | Paid: ${charge.paid} | Created: ${formatDate(charge.created * 1000)}`));
    },

    async stripe_get_charge(params = {}) {
      const charge = await stripeRequest(rootDirectory, `/charges/${encodeURIComponent(requireText(params.charge_id ?? params.chargeId, 'charge_id'))}`);
      return [
        `Stripe charge: ${charge.id}`,
        `Amount: ${money(charge.amount, charge.currency)}`,
        `Status: ${charge.status}`,
        `Paid: ${charge.paid}`,
        `Customer: ${charge.customer ?? '(none)'}`,
        `Receipt: ${charge.receipt_url ?? '(none)'}`
      ].join('\n');
    },

    async stripe_list_payment_intents(params = {}) {
      const limit = clampInteger(params.limit, 10, 1, 50);
      const data = await stripeRequest(rootDirectory, '/payment_intents', { searchParams: { limit } });
      return formatList('Stripe payment intents', (data.data ?? []).map((intent, index) => `${index + 1}. ${intent.id}: ${money(intent.amount, intent.currency)}\n   Status: ${intent.status} | Customer: ${intent.customer ?? '(none)'} | Created: ${formatDate(intent.created * 1000)}`));
    }
  };
}
