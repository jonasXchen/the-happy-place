import {
  sameOrigin,
  requireStaff,
  service,
  apiError,
  HttpError,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const staff = await requireStaff();
    if (
      !staff.roles.some((role: string) =>
        ["owner", "catalogue", "marketing"].includes(role),
      )
    )
      throw new HttpError("Your role cannot upload catalogue images.", 403);
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 10 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new HttpError("Choose a JPG, PNG, or WebP image under 10 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    if (!(
      (file.type === "image/jpeg" && jpeg) ||
      (file.type === "image/png" && png) ||
      (file.type === "image/webp" && webp)
    ))
      throw new HttpError("The file contents do not match its image type.");
    const path = `${crypto.randomUUID()}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
    const db = service();
    const { error } = await db.storage
      .from("thp-images")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw error;
    return Response.json({
      url: db.storage.from("thp-images").getPublicUrl(path).data.publicUrl,
    });
  } catch (e) {
    return apiError(e);
  }
}
