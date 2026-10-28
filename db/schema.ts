import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
export const platformMaintenanceRuns=sqliteTable("platform_maintenance_runs",{id:text("id").primaryKey(),status:text("status").notNull(),leaseUntil:integer("lease_until").notNull().default(0),cursor:text("cursor").notNull().default(""),mediaDeleted:integer("media_deleted").notNull().default(0),reportJson:text("report_json").notNull().default("{}"),createdAt:text("created_at").notNull(),completedAt:text("completed_at")});
export const asaasAccounts=sqliteTable("asaas_accounts",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),environment:text("environment").notNull(),customerId:text("customer_id").notNull(),documentHash:text("document_hash").notNull(),createdAt:text("created_at").notNull()},t=>[uniqueIndex("asaas_accounts_customer_idx").on(t.environment,t.customerId)]);
export const asaasIntents=sqliteTable("asaas_intents",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),environment:text("environment").notNull(),activeKey:text("active_key").unique(),plan:text("plan").notNull(),catalogVersion:integer("catalog_version").notNull().default(1),firstDueDate:text("first_due_date").notNull().default(""),reference:text("reference").notNull().unique(),documentHash:text("document_hash").notNull(),state:text("state").notNull().default("new"),customerId:text("customer_id").notNull().default(""),subscriptionId:text("subscription_id").notNull().default(""),leaseToken:text("lease_token").notNull().default(""),leaseUntil:integer("lease_until").notNull().default(0),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[index("asaas_intents_owner_idx").on(t.ownerId,t.environment)]);
export const asaasSubscriptions=sqliteTable("asaas_subscriptions",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),environment:text("environment").notNull(),remoteId:text("remote_id").notNull(),customerId:text("customer_id").notNull(),intentId:text("intent_id").notNull().references(()=>asaasIntents.id),plan:text("plan").notNull(),status:text("status").notNull(),paidThrough:integer("paid_through").notNull().default(0),paidPlan:text("paid_plan").notNull().default(""),syncToken:text("sync_token").notNull().default(""),syncUntil:integer("sync_until").notNull().default(0),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("asaas_subscriptions_remote_idx").on(t.environment,t.remoteId),index("asaas_subscriptions_owner_idx").on(t.ownerId,t.environment)]);
export const asaasPayments=sqliteTable("asaas_payments",{id:text("id").primaryKey(),subscriptionKey:text("subscription_key").notNull().references(()=>asaasSubscriptions.id),remoteId:text("remote_id").notNull(),customerId:text("customer_id").notNull(),status:text("status").notNull(),amount:integer("amount").notNull(),dueDate:text("due_date").notNull(),invoiceUrl:text("invoice_url").notNull().default(""),updatedAt:text("updated_at").notNull()},t=>[index("asaas_payments_subscription_idx").on(t.subscriptionKey,t.dueDate)]);
export const asaasEvents=sqliteTable("asaas_events",{id:text("id").primaryKey(),resourceId:text("resource_id").notNull(),event:text("event").notNull(),createdAt:text("created_at").notNull()});
export const accountAccess=sqliteTable("account_access",{
 ownerId:text("owner_id").primaryKey(),mode:text("mode").notNull().default("normal"),
 tier:text("tier").notNull().default(""),plan:text("plan"),catalogVersion:integer("catalog_version").notNull().default(1),expiresAt:integer("expires_at"),reason:text("reason").notNull().default(""),
 updatedBy:text("updated_by").notNull(),updatedAt:text("updated_at").notNull(),version:integer("version").notNull().default(1)
});
export const accountAccessEvents=sqliteTable("account_access_events",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),actorId:text("actor_id").notNull(),
 action:text("action").notNull(),tier:text("tier").notNull().default(""),plan:text("plan"),expiresAt:integer("expires_at"),
 reason:text("reason").notNull(),createdAt:text("created_at").notNull()
},t=>[index("account_access_events_owner_idx").on(t.ownerId,t.createdAt)]);
export const trialCampaigns=sqliteTable("trial_campaigns",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),trialStarted:integer("trial_started").notNull(),round:integer("round").notNull(),sourceVersion:text("source_version").notNull(),snapshot:text("snapshot").notNull(),brief:text("brief").notNull(),textRequest:text("text_request").notNull(),imageRequests:text("image_requests").notNull(),proposal:text("proposal"),createdAt:text("created_at").notNull()},t=>[uniqueIndex("trial_campaign_owner_round_idx").on(t.ownerId,t.trialStarted,t.round)]);
export const restaurantSupport=sqliteTable("restaurant_support",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id,{onDelete:"cascade"}),requestId:text("request_id").notNull(),inputHash:text("input_hash").notNull(),actorId:text("actor_id").notNull(),actorRole:text("actor_role").notNull(),kind:text("kind").notNull(),asset:text("asset").notNull(),productId:text("product_id").notNull().default(""),message:text("message").notNull(),url:text("url").notNull().default(""),state:text("state").notNull().default("available"),version:integer("version").notNull().default(1),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),updatedBy:text("updated_by").notNull(),
},t=>[uniqueIndex("restaurant_support_request_idx").on(t.restaurantId,t.requestId),index("restaurant_support_history_idx").on(t.restaurantId,t.createdAt,t.id)]);
export const accountTrials=sqliteTable("account_trials",{ownerId:text("owner_id").primaryKey(),registeredAt:text("registered_at").notNull(),startedAt:integer("started_at"),endsAt:integer("ends_at")});
export const pushSubscriptions=sqliteTable("push_subscriptions",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),endpointHash:text("endpoint_hash").notNull().unique(),sealedSubscription:text("sealed_subscription").notNull(),sessionId:text("session_id"),publicKeyHash:text("public_key_hash").notNull(),orders:integer("orders").notNull().default(1),messages:integer("messages").notNull().default(1),delivery:integer("delivery").notNull().default(1),expiresAt:integer("expires_at").notNull(),lastStatus:integer("last_status"),lastSentAt:text("last_sent_at"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[index("push_subscriptions_owner_idx").on(t.ownerId,t.expiresAt)]);
export const pushDeliveries=sqliteTable("push_deliveries",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),subscriptionId:text("subscription_id").notNull().references(()=>pushSubscriptions.id,{onDelete:"cascade"}),eventId:text("event_id").notNull(),payload:text("payload").notNull(),state:text("state").notNull().default("queued"),attempts:integer("attempts").notNull().default(0),availableAt:integer("available_at").notNull(),expiresAt:integer("expires_at").notNull(),leaseUntil:integer("lease_until").notNull().default(0),lastStatus:integer("last_status"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("push_deliveries_event_idx").on(t.eventId,t.subscriptionId),index("push_deliveries_pending_idx").on(t.ownerId,t.state,t.availableAt)]);
export const restaurants = sqliteTable("restaurants", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), slug: text("slug").notNull().unique(), name: text("name").notNull(),
  data: text("data").notNull(), publishedData: text("published_data"), revision: integer("revision").notNull().default(1),
  liveRevision: integer("live_revision").notNull().default(0), published: integer("published", {mode:"boolean"}).notNull().default(false),
  plan: text("plan").notNull().default("essencial"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("restaurants_owner_idx").on(t.ownerId)]);
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), restaurantId: text("restaurant_id").notNull().references(()=>restaurants.id), requestId: text("request_id").notNull(),
  customer: text("customer").notNull(), phone: text("phone").notNull(), data: text("data").notNull(), total: integer("total").notNull(),
  status: text("status").notNull().default("awaiting"), createdAt: text("created_at").notNull(),
  acceptedAt:text("accepted_at"),acceptedEtaMinutes:integer("accepted_eta_minutes"),trackingHash:text("tracking_hash"),paymentStatus:text("payment_status").notNull().default("pay_on_delivery"),pixSnapshot:text("pix_snapshot"),receiptId:text("receipt_id"),receiptCount:integer("receipt_count").notNull().default(0),version:integer("version").notNull().default(1),estimatedAt:text("estimated_at"),approvedAt:text("approved_at"),decisionReason:text("decision_reason"),updatedAt:text("updated_at"),
}, t => [index("orders_restaurant_idx").on(t.restaurantId,t.createdAt), uniqueIndex("orders_request_idx").on(t.restaurantId,t.requestId)]);
export const deliveryChecks=sqliteTable("delivery_checks",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),
 requestId:text("request_id").notNull(),tokenHash:text("token_hash").notNull(),
 phone:text("phone").notNull(),address:text("address").notNull(),
 latitude:real("latitude"),longitude:real("longitude"),
 neighborhood:text("neighborhood"),zoneId:text("zone_id"),deliveryFee:integer("delivery_fee"),
 status:text("status").notNull().default("pending"),version:integer("version").notNull().default(1),
 createdAt:text("created_at").notNull(),expiresAt:integer("expires_at").notNull(),reviewedAt:text("reviewed_at"),
},t=>[uniqueIndex("delivery_checks_request_idx").on(t.restaurantId,t.requestId),index("delivery_checks_owner_queue_idx").on(t.restaurantId,t.status,t.createdAt)]);
export const orderMessages=sqliteTable("order_messages",{
 id:text("id").primaryKey(),orderId:text("order_id").notNull().references(()=>orders.id),sender:text("sender").notNull(),body:text("body").notNull(),createdAt:text("created_at").notNull(),
},t=>[index("order_messages_order_idx").on(t.orderId,t.createdAt)]);
export const orderReceipts=sqliteTable("order_receipts",{id:text("id").primaryKey(),orderId:text("order_id").notNull().references(()=>orders.id),objectKey:text("object_key").notNull().unique(),mime:text("mime").notNull(),size:integer("size").notNull(),createdAt:text("created_at").notNull()},t=>[index("order_receipts_order_idx").on(t.orderId)]);
export const orderEvents=sqliteTable("order_events",{id:text("id").primaryKey(),orderId:text("order_id").notNull().references(()=>orders.id),version:integer("version").notNull(),actorId:text("actor_id"),action:text("action").notNull(),message:text("message").notNull(),createdAt:text("created_at").notNull()},t=>[uniqueIndex("order_events_version_idx").on(t.orderId,t.version)]);

export const subscriptions = sqliteTable("subscriptions", {
  ownerId: text("owner_id").primaryKey(), customerId: text("customer_id").notNull(), subscriptionId: text("subscription_id").notNull().unique(),
  plan: text("plan").notNull(), paidPlan:text("paid_plan").notNull().default(""), status: text("status").notNull(), periodEnd: integer("period_end").notNull().default(0), paidThrough:integer("paid_through").notNull().default(0), updatedAt: text("updated_at").notNull(),
});
export const billingEvents = sqliteTable("billing_events", {id:text("id").primaryKey(),createdAt:text("created_at").notNull()});
export const billingCustomers = sqliteTable("billing_customers", {ownerId:text("owner_id").primaryKey(),customerId:text("customer_id").notNull().unique(),createdAt:text("created_at").notNull()});

export const accountProfiles = sqliteTable("account_profiles", {ownerId:text("owner_id").primaryKey(),name:text("name").notNull(),email:text("email").notNull(),provider:text("provider").notNull(),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()});
export const authSessions = sqliteTable("auth_sessions", {
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),email:text("email").notNull(),displayName:text("display_name").notNull(),scope:text("scope").notNull(),sealedTokens:text("sealed_tokens").notNull(),tokenExpiresAt:integer("token_expires_at").notNull(),expiresAt:integer("expires_at").notNull(),refreshLock:integer("refresh_lock").notNull().default(0),createdAt:text("created_at").notNull(),
},t=>[index("auth_sessions_owner_idx").on(t.ownerId),index("auth_sessions_expiry_idx").on(t.expiresAt)]);
export const rateBuckets=sqliteTable("rate_buckets",{id:text("id").primaryKey(),hits:integer("hits").notNull(),expiresAt:integer("expires_at").notNull()},t=>[index("rate_buckets_expiry_idx").on(t.expiresAt)]);
export const aiUsage=sqliteTable("ai_usage",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),periodKey:text("period_key").notNull(),credits:integer("credits").notNull().default(0),inputTokens:integer("input_tokens").notNull().default(0),outputTokens:integer("output_tokens").notNull().default(0),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("ai_usage_owner_period_idx").on(t.ownerId,t.periodKey)]);
export const aiJobs=sqliteTable("ai_jobs",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),restaurantId:text("restaurant_id").notNull(),inputHash:text("input_hash").notNull(),usageId:text("usage_id").notNull(),state:text("state").notNull(),credits:integer("credits").notNull(),result:text("result"),createdAt:text("created_at").notNull()},t=>[index("ai_jobs_owner_idx").on(t.ownerId),index("ai_jobs_created_idx").on(t.createdAt)]);
export const imageJobs=sqliteTable("image_jobs",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),requestId:text("request_id").notNull(),inputHash:text("input_hash").notNull(),tokenHash:text("token_hash").notNull(),prompt:text("prompt").notNull(),asset:text("asset").notNull(),campaignKey:text("campaign_key").notNull().default(""),promotionId:text("promotion_id"),sourceVersion:text("source_version"),state:text("state").notNull(),periodKey:text("period_key").notNull(),resultUrl:text("result_url"),createdAt:text("created_at").notNull(),expiresAt:text("expires_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("image_jobs_request_idx").on(t.ownerId,t.restaurantId,t.requestId),index("image_jobs_owner_period_idx").on(t.ownerId,t.periodKey),index("image_jobs_created_idx").on(t.createdAt)]);

export const studioJobs=sqliteTable("studio_jobs",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),requestId:text("request_id").notNull(),inputHash:text("input_hash").notNull(),tokenHash:text("token_hash").notNull(),prompt:text("prompt").notNull(),state:text("state").notNull(),periodKey:text("period_key").notNull(),result:text("result"),createdAt:text("created_at").notNull(),expiresAt:text("expires_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("studio_jobs_request_idx").on(t.ownerId,t.restaurantId,t.requestId),index("studio_jobs_owner_period_idx").on(t.ownerId,t.periodKey),index("studio_jobs_created_idx").on(t.createdAt)]);

export const aiBudgetReservations=sqliteTable("ai_budget_reservations",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),kind:text("kind").notNull(),periodKey:text("period_key").notNull(),budgetPeriod:text("budget_period").notNull(),cohort:text("cohort").notNull(),units:integer("units").notNull(),state:text("state").notNull(),createdAt:text("created_at").notNull()},t=>[index("ai_budget_month_idx").on(t.budgetPeriod,t.state),index("ai_budget_owner_idx").on(t.ownerId,t.periodKey)]);

// Merchant review is separate from editable menu JSON and from SaaS subscriptions.
export const storeVerifications=sqliteTable("store_verifications",{
 restaurantId:text("restaurant_id").primaryKey().references(()=>restaurants.id),status:text("status").notNull(),
 identityHash:text("identity_hash").notNull(),identityJson:text("identity_json").notNull(),requestNote:text("request_note").notNull(),
 requestedAt:text("requested_at").notNull(),reviewedAt:text("reviewed_at"),reviewedBy:text("reviewed_by"),reason:text("reason").notNull().default(""),
 version:integer("version").notNull().default(1),updatedAt:text("updated_at").notNull(),
},t=>[index("store_verifications_queue_idx").on(t.status,t.requestedAt)]);
export const storeVerificationEvents=sqliteTable("store_verification_events",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),actorId:text("actor_id").notNull(),
 action:text("action").notNull(),reason:text("reason").notNull(),identityHash:text("identity_hash").notNull(),version:integer("version").notNull(),createdAt:text("created_at").notNull(),
},t=>[uniqueIndex("store_verification_events_version_idx").on(t.restaurantId,t.version)]);
export const storeReports=sqliteTable("store_reports",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),requestId:text("request_id").notNull(),reporterHash:text("reporter_hash").notNull(),
 category:text("category").notNull(),detail:text("detail").notNull(),contact:text("contact").notNull().default(""),orderReference:text("order_reference").notNull().default(""),
 status:text("status").notNull().default("open"),createdAt:text("created_at").notNull(),reviewedAt:text("reviewed_at"),reviewedBy:text("reviewed_by"),resolution:text("resolution").notNull().default(""),version:integer("version").notNull().default(1),
},t=>[uniqueIndex("store_reports_request_idx").on(t.restaurantId,t.reporterHash,t.requestId),index("store_reports_queue_idx").on(t.status,t.createdAt)]);

export const menuImportAssistance=sqliteTable("menu_import_assistance",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id,{onDelete:"cascade"}),
 ownerId:text("owner_id").notNull(),storeUrl:text("store_url").notNull(),ownerNote:text("owner_note").notNull().default(""),notifyWhenReady:integer("notify_when_ready").notNull().default(0),contactWhatsApp:text("contact_whatsapp").notNull(),contactConsentAt:text("contact_consent_at").notNull(),
 status:text("status").notNull().default("requested"),captureJson:text("capture_json"),
 pairingHash:text("pairing_hash"),pairingExpiresAt:integer("pairing_expires_at"),
 createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),receivedAt:text("received_at")
},t=>[index("menu_import_assistance_status_idx").on(t.status,t.createdAt),index("menu_import_assistance_owner_idx").on(t.ownerId,t.createdAt)]);

export const menuImportAssistancePhotos=sqliteTable("menu_import_assistance_photos",{
 id:text("id").primaryKey(),requestId:text("request_id").notNull().references(()=>menuImportAssistance.id,{onDelete:"cascade"}),
 itemId:text("item_id").notNull(),sourceUrl:text("source_url").notNull(),mediaUrl:text("media_url").notNull(),
 sizeBytes:integer("size_bytes").notNull(),createdAt:text("created_at").notNull()
},t=>[uniqueIndex("menu_import_assistance_photos_pair_idx").on(t.requestId,t.itemId),index("menu_import_assistance_photos_request_idx").on(t.requestId)]);

// Anonymous, unlisted design previews contain no account credentials.
export const guestMenuPreviews=sqliteTable("guest_menu_previews",{id:text("id").primaryKey(),objectKey:text("object_key").notNull(),createdAt:integer("created_at").notNull(),expiresAt:integer("expires_at").notNull()});

// Administrator-created, unlisted prospect previews. No account or payment credentials.
export const adminSharedMenus=sqliteTable("admin_shared_menus",{
 id:text("id").primaryKey(),createdBy:text("created_by").notNull(),requestId:text("request_id").notNull(),contentHash:text("content_hash").notNull(),
 label:text("label").notNull(),objectKey:text("object_key").notNull(),createdAt:integer("created_at").notNull(),updatedAt:integer("updated_at").notNull(),
 expiresAt:integer("expires_at").notNull(),disabledAt:integer("disabled_at"),version:integer("version").notNull().default(1)
},t=>[uniqueIndex("admin_shared_menus_request_idx").on(t.requestId),index("admin_shared_menus_created_idx").on(t.createdAt)]);

export const accountNotices=sqliteTable("account_notices",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),eventKey:text("event_key").notNull(),title:text("title").notNull(),body:text("body").notNull(),path:text("path").notNull(),createdAt:text("created_at").notNull(),readAt:text("read_at"),
},t=>[uniqueIndex("account_notices_event_idx").on(t.ownerId,t.eventKey),index("account_notices_owner_idx").on(t.ownerId,t.createdAt)]);
export const siteVisits=sqliteTable("site_visits",{
 id:text("id").primaryKey(),visitorHash:text("visitor_hash").notNull(),page:text("page").notNull(),day:text("day").notNull(),createdAt:text("created_at").notNull(),
},t=>[uniqueIndex("site_visits_day_idx").on(t.visitorHash,t.page,t.day),index("site_visits_time_idx").on(t.createdAt)]);
export const operationErrors=sqliteTable("operation_errors",{
 id:text("id").primaryKey(),area:text("area").notNull(),code:text("code").notNull(),day:text("day").notNull(),hits:integer("hits").notNull().default(1),lastAt:text("last_at").notNull(),
},t=>[uniqueIndex("operation_errors_day_idx").on(t.area,t.code,t.day)]);

export const accountActivity=sqliteTable("account_activity",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),area:text("area").notNull(),day:text("day").notNull(),
 opens:integer("opens").notNull().default(0),actions:integer("actions").notNull().default(0),firstAt:text("first_at").notNull(),lastAt:text("last_at").notNull(),
},t=>[uniqueIndex("account_activity_day_idx").on(t.ownerId,t.area,t.day),index("account_activity_time_idx").on(t.lastAt)]);

// Before-order questions are private to the visitor token and the shop owner.
export const assistantConversations=sqliteTable("assistant_conversations",{
 id:text("id").primaryKey(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id,{onDelete:"cascade"}),
 tokenHash:text("token_hash").notNull(),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),expiresAt:integer("expires_at").notNull(),
 pendingRequest:text("pending_request"),pendingUntil:integer("pending_until").notNull().default(0),
},t=>[index("assistant_conversations_shop_idx").on(t.restaurantId,t.updatedAt),index("assistant_conversations_expiry_idx").on(t.expiresAt)]);
export const assistantTurns=sqliteTable("assistant_turns",{
 id:text("id").primaryKey(),conversationId:text("conversation_id").notNull().references(()=>assistantConversations.id,{onDelete:"cascade"}),
 requestId:text("request_id").notNull(),inputHash:text("input_hash").notNull(),question:text("question").notNull(),answer:text("answer"),
 state:text("state").notNull(),source:text("source").notNull().default("local"),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("assistant_turns_request_idx").on(t.conversationId,t.requestId),index("assistant_turns_conversation_idx").on(t.conversationId,t.createdAt)]);
