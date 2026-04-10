ALTER TABLE "funnel_event" DROP CONSTRAINT "funnel_event_event_check";
--> statement-breakpoint
ALTER TABLE "funnel_event" ADD CONSTRAINT "funnel_event_event_check" CHECK ("event" IN (
	'demo_verify_ok',
	'sign_in',
	'checkout_started',
	'subscription_checkout_completed',
	'api_key_created',
	'reserve_allowed'
));
