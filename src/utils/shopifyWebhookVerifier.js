const crypto = require("crypto")

const verifyShopifyWebhook = (data, hmacHeader) => {
  const calculatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(data, "utf8")
    .digest("base64")

  return crypto.timingSafeEqual(Buffer.from(calculatedHmac, "base64"), Buffer.from(hmacHeader, "base64"))
}

module.exports = {
  verifyShopifyWebhook,
}
