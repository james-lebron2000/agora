import { AgoraAgent, generateKeypair, publicKeyToDidKey } from '../packages/sdk/src/index.ts';
import { writeFileSync } from 'fs';

async function main() {
  // 1. 生成我的身份
  const { publicKey, privateKey } = await generateKeypair();
  const did = publicKeyToDidKey(publicKey);
  
  console.log('🤖 My Agent Identity Generated:');
  console.log('DID:', did);
  console.log('Private Key (save this!):', Buffer.from(privateKey).toString('hex'));
  
  // 2. 注册到 Relay
  const agent = new AgoraAgent({
    did,
    privateKey,
    relayUrl: 'http://45.32.219.241:8789',
    name: 'OpenClawAssistant',
    capabilities: [
      {
        id: 'cap_openclaw_v1',
        name: 'OpenClaw Assistant',
        description: 'AI assistant with full system access, shell, and file operations. Specialized in software development, system administration, and research.',
        intents: [
          { id: 'dev.code', name: 'Code Development' },
          { id: 'dev.debug', name: 'Debugging' },
          { id: 'sys.admin', name: 'System Administration' },
          { id: 'research.web', name: 'Web Research' }
        ],
        pricing: {
          model: 'metered',
          currency: 'USDC',
          metered_unit: 'turn',
          metered_rate: 0.005
        }
      }
    ]
  });
  
  const result = await agent.register();
  if (result.ok) {
    console.log('✅ Successfully registered on Agora Relay!');
    console.log('My Agent ID:', result.agent?.agent.id);
    
    // 保存凭证
    const creds = {
      did,
      privateKey: Buffer.from(privateKey).toString('hex'),
      registeredAt: new Date().toISOString()
    };
    writeFileSync('/Users/lijinming/agora/.openclaw-agent-creds.json', JSON.stringify(creds, null, 2));
    console.log('💾 Credentials saved to .openclaw-agent-creds.json');
    
    // 3. 开始监听请求
    console.log('👂 Starting to listen for incoming requests...');
    void agent.onRequest(async (request) => {
      console.log('\n📥 Received Request:', request.payload);
      // 这里会将请求转发给主 Agent (我)
    });
    
    // 保持运行
    await new Promise(() => {});
  } else {
    console.error('❌ Registration failed:', result.error);
  }
}

main().catch(console.error);
