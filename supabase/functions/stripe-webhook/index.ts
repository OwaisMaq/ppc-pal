import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    
    stripe.webhooks.constructEvent(body, signature, secret);
    return true;
  } catch (error) {
    console.error('Stripe signature verification failed:', error);
    return false;
  }
}

function determinePlan(priceId: string, amount: number): string {
  // Map price amounts to plan names
  if (amount <= 999) { // $9.99 or less
    return 'starter';
  } else if (amount <= 2999) { // $29.99 or less
    return 'pro';
  } else {
    return 'enterprise';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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
    // Get the raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Stripe signature
    const isValidSignature = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('Invalid Stripe signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the event
    const event = JSON.parse(rawBody);
    console.log(`Processing Stripe webhook: ${event.type}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    let processed = false;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Checkout completed for customer: ${session.customer}`);

        if (session.mode === 'subscription' && session.customer) {
          // Get customer details
          const customer = await stripe.customers.retrieve(session.customer as string);
          if (customer.deleted) {
            throw new Error('Customer was deleted');
          }

          // Find user by email
          const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(customer.email!);
          if (userError || !userData.user) {
            console.error(`User not found for email: ${customer.email}`);
            break;
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0].price.id;
          const price = await stripe.prices.retrieve(priceId);
          
          const plan = determinePlan(priceId, price.unit_amount || 0);

          // Upsert billing subscription
          const { error: billingError } = await supabase
            .from('billing_subscriptions')
            .upsert({
              user_id: userData.user.id,
              stripe_customer_id: customer.id,
              stripe_subscription_id: subscription.id,
              plan: plan,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

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

        // Get customer
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer.deleted) {
          throw new Error('Customer was deleted');
        }

        // Find user by email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(customer.email!);
        if (userError || !userData.user) {
          console.error(`User not found for email: ${customer.email}`);
          break;
        }

        // Get price details
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        const plan = determinePlan(priceId, price.unit_amount || 0);

        // Update billing subscription
        const { error: billingError } = await supabase
          .from('billing_subscriptions')
          .upsert({
            user_id: userData.user.id,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            plan: plan,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (billingError) {
          console.error('Failed to update billing subscription:', billingError);
        } else {
          console.log(`Updated subscription for user ${userData.user.id}: ${subscription.status}`);
          processed = true;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(`Subscription deleted: ${subscription.id}`);

        // Find billing subscription by stripe subscription id
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
          // Update to free plan
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
      JSON.stringify({ 
        received: true, 
        processed,
        event_type: event.type 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        message: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});