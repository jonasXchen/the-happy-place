import { z } from "zod";
import { sameOrigin, apiError, HttpError, rateLimit } from "@/lib/server";
import { getSiteData } from "@/lib/data";
import { quote, isPublished, remoteAddress } from "@/lib/commerce";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await rateLimit(request, "quote", 60);
    const body = z
      .object({
        lines: z
          .array(
            z.object({
              variant_id: z.uuid(),
              quantity: z.number().int().min(1).max(20),
            }),
          )
          .min(1)
          .max(50),
        split: z.boolean(),
        method: z.enum(["standard", "express"]).default("standard"),
        street: z.string().max(120),
        postal: z.string().max(6),
        reward_id: z.uuid().nullable(),
        coupon: z.string().max(40),
      })
      .parse(await request.json());
    const data = await getSiteData(true);
    const reward = data.rewards.find(
      (r) => r.id === body.reward_id && isPublished(r),
    );
    const campaign = data.campaigns.find(
      (c) => c.code === body.coupon.toUpperCase() && isPublished(c),
    );
    if (body.reward_id && !reward)
      throw new HttpError("This reward is unavailable.");
    if (body.coupon && !campaign)
      throw new HttpError("This discount code is unavailable.");
    if (reward && campaign)
      throw new HttpError("Choose a reward or a discount code.");
    if (campaign && campaign.max_uses > 0 && campaign.uses >= campaign.max_uses)
      throw new HttpError("This offer has reached its redemption limit.");
    const remote = remoteAddress(data.settings, body.street, body.postal);
    return Response.json(
      quote(data.products, body.lines, data.settings, {
        split: body.split,
        remote,
        reward,
        campaign,
        method: body.method,
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
