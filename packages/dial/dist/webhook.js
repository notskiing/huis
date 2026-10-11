import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyDialWebhook(secret, signature, rawBody, nowSeconds = Date.now() / 1000) {
    try {
        const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
        const timestamp = parts.t;
        const supplied = parts.v1;
        if (!timestamp || !supplied || Math.abs(nowSeconds - Number(timestamp)) >= 300)
            return false;
        const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
        const suppliedBytes = Buffer.from(supplied, "hex");
        const expectedBytes = Buffer.from(expected, "hex");
        return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=webhook.js.map