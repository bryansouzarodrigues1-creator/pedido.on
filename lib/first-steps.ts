import { z } from "zod";
import { decimalValue } from "./profit-calculator.ts";
import { phoneNumber, type RestaurantData } from "./domain.ts";
import { availableProduct } from "./menu-sales.ts";

const amount = z.string().max(24);
export const firstStepsSchema = z.object({
  version: z.literal(1),
  step: z.number().int().min(0).max(3),
  cost: amount,
  price: amount,
  extras: amount,
  fees: amount,
  fixed: amount,
  costReview: z.string().max(200),
  deliveryReview: z.string().max(1200),
}).strict();
export type FirstStepsStudy = z.infer<typeof firstStepsSchema>;
export const emptyFirstSteps = (): FirstStepsStudy => ({
  version: 1, step: 0, cost: "", price: "", extras: "0", fees: "0", fixed: "0", costReview: "", deliveryReview: "",
});
export function firstStepsKey(restaurantId: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(restaurantId)) throw Error("Pizzaria inválida.");
  return "pizzaria-on:first-steps:v1:" + restaurantId;
}
export function readFirstSteps(storage: Pick<Storage, "getItem">, restaurantId: string): FirstStepsStudy {
  const raw = storage.getItem(firstStepsKey(restaurantId));
  if (!raw) return emptyFirstSteps();
  const value = firstStepsSchema.safeParse(JSON.parse(raw));
  return value.success ? value.data : emptyFirstSteps();
}
export function writeFirstSteps(storage: Pick<Storage, "setItem">, restaurantId: string, study: FirstStepsStudy) {
  storage.setItem(firstStepsKey(restaurantId), JSON.stringify(firstStepsSchema.parse(study)));
}
export function studySignature(study: Pick<FirstStepsStudy, "cost" | "price" | "extras" | "fees" | "fixed">) {
  return JSON.stringify([study.cost, study.price, study.extras, study.fees, study.fixed]);
}
export function firstSale(study: Pick<FirstStepsStudy, "cost" | "price" | "extras" | "fees" | "fixed">) {
  const cost = Math.round(decimalValue(study.cost) * 100), price = Math.round(decimalValue(study.price) * 100);
  const extras = Math.round(decimalValue(study.extras || "0") * 100), fixed = Math.round(decimalValue(study.fixed || "0") * 100);
  const rate = decimalValue(study.fees || "0");
  if (![cost, price, extras, fixed].every(Number.isSafeInteger) || cost <= 0 || price <= 0 || cost > 1000000 || price > 1000000 || extras < 0 || extras > 1000000 || fixed < 0 || fixed > 1000000 || !Number.isFinite(rate) || rate < 0 || rate > 90) return null;
  const fees = Math.round(price * Math.round(rate * 100) / 10000);
  return { cost, price, extras, fixed, fees, remaining: price - cost - extras - fixed - fees, costShare: cost / price * 100 };
}
export function deliverySignature(data: RestaurantData) {
  return JSON.stringify([phoneNumber(data.whatsapp), data.deliveryEnabled, data.pickupEnabled, data.deliveryFee, data.eta.trim(), data.hours.trim(), data.pickupEnabled ? data.address.trim() : "", data.payments]);
}
export function starterStoreReady(data: RestaurantData) {
  const phone = phoneNumber(data.whatsapp);
  return phone.length >= 12 && phone.length <= 15 && (data.deliveryEnabled || data.pickupEnabled) && (!data.pickupEnabled || !!data.address.trim()) && data.payments.length > 0;
}
export function firstStepsProgress(saved: RestaurantData, published: boolean, study: FirstStepsStudy) {
  return [
    saved.products.some(availableProduct),
    !!firstSale(study) && study.costReview === studySignature(study),
    starterStoreReady(saved) && !!saved.hours.trim() && study.deliveryReview === deliverySignature(saved),
    published,
  ];
}
