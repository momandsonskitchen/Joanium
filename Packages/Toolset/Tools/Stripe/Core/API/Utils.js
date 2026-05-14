// ─── Stripe response mappers ──────────────────────────────────────────────────
// Each mapper is shared between the corresponding list, get, and search
// functions so that the object shape is defined exactly once.

export function mapCharge(c) {
  return {
    id: c.id,
    amount: c.amount / 100,
    currency: c.currency?.toUpperCase() ?? '',
    status: c.status,
    description: c.description ?? null,
    receiptEmail: c.receipt_email ?? null,
    customerId: c.customer ?? null,
    created: c.created,
  };
}

export function mapSubscription(s) {
  return {
    id: s.id,
    status: s.status,
    customerId: s.customer,
    currentPeriodEnd: s.current_period_end,
    cancelAtPeriodEnd: s.cancel_at_period_end,
    created: s.created,
  };
}

export function mapInvoice(i) {
  return {
    id: i.id,
    customerId: i.customer,
    customerEmail: i.customer_email ?? null,
    amountDue: i.amount_due / 100,
    amountPaid: i.amount_paid / 100,
    currency: i.currency?.toUpperCase() ?? '',
    status: i.status,
    dueDate: i.due_date ?? null,
    created: i.created,
  };
}

export function mapPaymentIntent(p) {
  return {
    id: p.id,
    amount: p.amount / 100,
    currency: p.currency?.toUpperCase() ?? '',
    status: p.status,
    customerId: p.customer ?? null,
    description: p.description ?? null,
    created: p.created,
  };
}

export function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    active: p.active,
    created: p.created,
  };
}

export function mapRefund(r) {
  return {
    id: r.id,
    amount: r.amount / 100,
    currency: r.currency?.toUpperCase() ?? '',
    chargeId: r.charge,
    status: r.status,
    reason: r.reason ?? null,
    created: r.created,
  };
}

export function mapPayout(p) {
  return {
    id: p.id,
    amount: p.amount / 100,
    currency: p.currency?.toUpperCase() ?? '',
    status: p.status,
    arrivalDate: p.arrival_date,
    description: p.description ?? null,
    created: p.created,
  };
}

export function mapCoupon(c) {
  return {
    id: c.id,
    name: c.name ?? null,
    percentOff: c.percent_off ?? null,
    amountOff: c.amount_off != null ? c.amount_off / 100 : null,
    currency: c.currency?.toUpperCase() ?? null,
    duration: c.duration,
    timesRedeemed: c.times_redeemed,
    valid: c.valid,
    created: c.created,
  };
}

export function mapSubscriptionItem(si) {
  return {
    id: si.id,
    subscriptionId: si.subscription,
    priceId: si.price?.id ?? null,
    productId: si.price?.product ?? null,
    quantity: si.quantity ?? null,
    created: si.created,
  };
}

export function mapInvoiceItem(ii) {
  return {
    id: ii.id,
    customerId: ii.customer,
    invoiceId: ii.invoice ?? null,
    amount: ii.amount / 100,
    currency: ii.currency?.toUpperCase() ?? '',
    description: ii.description ?? null,
    proration: ii.proration,
    quantity: ii.quantity,
    created: ii.date,
  };
}

export function mapShippingRate(sr) {
  return {
    id: sr.id,
    displayName: sr.display_name,
    type: sr.type,
    fixedAmount: sr.fixed_amount
      ? {
          amount: sr.fixed_amount.amount / 100,
          currency: sr.fixed_amount.currency?.toUpperCase() ?? '',
        }
      : null,
    active: sr.active,
    deliveryEstimate: sr.delivery_estimate ?? null,
    created: sr.created,
  };
}

export function mapTopup(t) {
  return {
    id: t.id,
    amount: t.amount / 100,
    currency: t.currency?.toUpperCase() ?? '',
    status: t.status,
    description: t.description ?? null,
    expectedAvailabilityDate: t.expected_availability_date ?? null,
    created: t.created,
  };
}

export function mapReview(r) {
  return {
    id: r.id,
    chargeId: r.charge ?? null,
    paymentIntentId: r.payment_intent ?? null,
    reason: r.reason,
    open: r.open,
    openedReason: r.opened_reason,
    closedReason: r.closed_reason ?? null,
    billingZip: r.billing_zip ?? null,
    created: r.created,
  };
}

export function mapPlan(p) {
  return {
    id: p.id,
    nickname: p.nickname ?? null,
    amount: p.amount != null ? p.amount / 100 : null,
    currency: p.currency?.toUpperCase() ?? '',
    interval: p.interval,
    intervalCount: p.interval_count,
    productId: p.product,
    active: p.active,
    trialPeriodDays: p.trial_period_days ?? null,
    created: p.created,
  };
}
