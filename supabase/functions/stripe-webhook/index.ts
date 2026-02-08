import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Map Stripe price amounts (cents) to plan names
function determinePlan(subscription: any): string {
  // First check subscription metadata
  const metaPlan = subscription.metadata?.plan;
  if (metaPlan && ['starter', 'pro', 'agency'].includes(metaPlan)) {
    return metaPlan;
  }

  // Fallback: determine from price amount
  const amount = subscription.items?.data?.[0]?.price?.unit_amount || 0;
  if (amount >= 19000) return 'agency';   // $190+
  if (amount >= 7000)  return 'pro';      // $70+
  if (amount >= 2000)  return 'starter';  // $20+
  return 'free';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !webhookSecret) {
    console.error('Missing required environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    
    // Verify signature
    try {
      stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Invalid Stripe signature:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(rawBody);
    console.log(`Processing Stripe webhook: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let processed = false;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Checkout completed for customer: ${session.customer}`);

        if (session.mode === 'subscription' && session.customer) {
          const customer = await stripe.customers.retrieve(session.customer as string);
          if (customer.deleted) throw new Error('Customer was deleted');

          const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(customer.email!);
          if (userError || !userData.user) {
            console.error(`User not found for email: ${customer.email}`);
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const plan = determinePlan(subscription);

          const { error: billingError } = await supabase
            .from('billing_subscriptions')
            .upsert({
              user_id: userData.user.id,
              stripe_customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id', ignoreDuplicates: false });

          if (billingError) {
            console.error('Failed to update billing subscription:', billingError);
          } else {
            console.log(`Updated billing subscription for user ${userData.user.id} to plan ${plan}`);
            processed = true;
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`Subscription updated: ${subscription.id}`);

        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer.deleted) throw new Error('Customer was deleted');

        const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(customer.email!);
        if (userError || !userData.user) {
          console.error(`User not found for email: ${customer.email}`);
          break;
        }

        const plan = determinePlan(subscription);

        const { error: billingError } = await supabase
          .from('billing_subscriptions')
          .upsert({
            user_id: userData.user.id,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id', ignoreDuplicates: false });

        if (billingError) {
          console.error('Failed to update billing subscription:', billingError);
        } else {
          console.log(`Updated subscription for user ${userData.user.id}: plan=${plan} status=${subscription.status}`);
          processed = true;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`Subscription deleted: ${subscription.id}`);

        const { data: billingData, error: billingFindError } = await supabase
          .from('billing_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        if (billingFindError) {
          console.error('Failed to find billing subscription:', billingFindError);
          break;
        }

        if (billingData) {
          const { error: billingError } = await supabase
            .from('billing_subscriptions')
            .update({
              plan: 'free',
              status: 'canceled',
              stripe_subscription_id: null,
              current_period_end: null,
              trial_end: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', billingData.user_id);

          if (billingError) {
            console.error('Failed to update billing subscription to free:', billingError);
          } else {
            console.log(`Subscription canceled for user ${billingData.user_id}, reverted to free plan`);
            processed = true;
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, processed, event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
