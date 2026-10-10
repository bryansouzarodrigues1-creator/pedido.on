import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
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
  trackingHash:text("tracking_hash"),paymentStatus:text("payment_status").notNull().default("pay_on_delivery"),pixSnapshot:text("pix_snapshot"),receiptId:text("receipt_id"),receiptCount:integer("receipt_count").notNull().default(0),version:integer("version").notNull().default(1),estimatedAt:text("estimated_at"),approvedAt:text("approved_at"),decisionReason:text("decision_reason"),updatedAt:text("updated_at"),
}, t => [index("orders_restaurant_idx").on(t.restaurantId,t.createdAt), uniqueIndex("orders_request_idx").on(t.restaurantId,t.requestId)]);
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
export const imageJobs=sqliteTable("image_jobs",{id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),restaurantId:text("restaurant_id").notNull().references(()=>restaurants.id),requestId:text("request_id").notNull(),inputHash:text("input_hash").notNull(),tokenHash:text("token_hash").notNull(),prompt:text("prompt").notNull(),asset:text("asset").notNull(),state:text("state").notNull(),periodKey:text("period_key").notNull(),resultUrl:text("result_url"),createdAt:text("created_at").notNull(),expiresAt:text("expires_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[uniqueIndex("image_jobs_request_idx").on(t.ownerId,t.restaurantId,t.requestId),index("image_jobs_owner_period_idx").on(t.ownerId,t.periodKey),index("image_jobs_created_idx").on(t.createdAt)]);
