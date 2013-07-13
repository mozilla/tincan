module.exports = {
  domain: process.env.DOMAIN_NAME || null,
  host: process.env.HOST || "http://127.0.0.1",
  port: process.env.PORT || 3000,
  persona_uri: process.env.PERSONA_URI || "http://127.0.0.1:10002",
  persona_verifier_uri: process.env.PERSONA_VERIFIER_URI || "http://127.0.0.1:10000/verify",
  title: process.env.TINCAN_TITLE || "tincan"
};
