module.exports = {
  host: process.env.HOST || "http://localhost",
  port: process.env.PORT || 3000,
  persona_uri: process.env.PERSONA_URI || "http://127.0.0.1:10002",
  persona_verifier_uri: process.env.PERSONA_VERIFIER_URI || "http://127.0.0.1:10000/verify"
};

