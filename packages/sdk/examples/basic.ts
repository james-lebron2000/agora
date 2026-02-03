import {
  EnvelopeBuilder,
  EnvelopeSigner,
  EnvelopeVerifier,
  generateKeypair,
  publicKeyToDidKey,
} from "../src/index.js";

const run = async () => {
  const { publicKey, privateKey } = await generateKeypair();
  const did = publicKeyToDidKey(publicKey);

  const envelope = new EnvelopeBuilder()
    .id("msg_demo_1")
    .type("REQUEST")
    .sender({ id: did, name: "DemoAgent" })
    .payload({ intent: "demo.echo", params: { text: "hello" } })
    .build();

  const signer = new EnvelopeSigner(privateKey);
  const signed = await signer.sign(envelope);

  const verifier = new EnvelopeVerifier();
  const ok = await verifier.verify(signed);

  console.log("signed:", signed);
  console.log("verified:", ok);
};

run();
