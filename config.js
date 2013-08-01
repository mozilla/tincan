module.exports = {
  domain: process.env.PUBLIC_URL || null,
  host: process.env.HOST || "http://10.251.30.175",
  port: process.env.PORT || 3000,
  persona_uri: process.env.PERSONA_URI || "https://webrtc.personatest.org",
  persona_verifier_uri: process.env.PERSONA_VERIFIER_URI || "https://webrtc.personatest.org/verify",
  title: process.env.TINCAN_TITLE || "tincan"
};
