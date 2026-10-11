import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
function keyFromEnvironment() {
    const source = process.env.DATA_ENCRYPTION_KEY || "huis-local-demo-key-do-not-use-in-production";
    return createHash("sha256").update(source).digest();
}
export function encrypt(value) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyFromEnvironment(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decrypt(value) {
    const [version, iv, tag, body] = value.split(".");
    if (version !== "v1" || !iv || !tag || !body)
        throw new Error("Invalid encrypted value");
    const decipher = createDecipheriv("aes-256-gcm", keyFromEnvironment(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
//# sourceMappingURL=crypto.js.map