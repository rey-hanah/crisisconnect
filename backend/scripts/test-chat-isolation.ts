import { io, Socket } from 'socket.io-client';

const API = 'http://localhost:3001';

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.access_token;
}

async function getMe(token: string) {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function getConversations(token: string) {
  const res = await fetch(`${API}/chat`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function createConversation(token: string, recipientId: string) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipientId }),
  });
  return res.json();
}

function connectSocket(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(API, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      reject(error);
    });
  });
}

async function testChatIsolation() {
  console.log('\n🧪 Testing Chat Message Isolation\n');
  console.log('This test verifies that messages only appear in the correct conversation\n');

  // Login as Alice, Bob, and Carol
  console.log('1️⃣  Logging in three users...');
  const aliceToken = await login('alice@demo.com', 'demo123');
  const bobToken = await login('bob@demo.com', 'demo123');
  const carolToken = await login('carol@demo.com', 'demo123');
  
  const alice = await getMe(aliceToken);
  const bob = await getMe(bobToken);
  const carol = await getMe(carolToken);
  
  console.log(`   ✅ Alice: ${alice.id}`);
  console.log(`   ✅ Bob: ${bob.id}`);
  console.log(`   ✅ Carol: ${carol.id}`);

  // Get or create conversations
  console.log('\n2️⃣  Setting up conversations...');
  
  // Alice-Bob conversation
  let aliceConvs = await getConversations(aliceToken);
  let aliceBobConv = aliceConvs.find(
    (c: any) => c.participant1._id === bob.id || c.participant2._id === bob.id,
  );
  if (!aliceBobConv) {
    aliceBobConv = await createConversation(aliceToken, bob.id);
  }
  console.log(`   📝 Alice-Bob conversation: ${aliceBobConv._id}`);

  // Alice-Carol conversation
  let aliceCarolConv = aliceConvs.find(
    (c: any) => c.participant1._id === carol.id || c.participant2._id === carol.id,
  );
  if (!aliceCarolConv) {
    aliceCarolConv = await createConversation(aliceToken, carol.id);
  }
  console.log(`   📝 Alice-Carol conversation: ${aliceCarolConv._id}`);

  // Connect sockets
  console.log('\n3️⃣  Connecting WebSockets...');
  const aliceSocket = await connectSocket(aliceToken);
  const bobSocket = await connectSocket(bobToken);
  const carolSocket = await connectSocket(carolToken);
  console.log('   ✅ All sockets connected');

  // Track messages
  const aliceMessages: any[] = [];
  const bobMessages: any[] = [];
  const carolMessages: any[] = [];

  aliceSocket.on('newMessage', (msg) => {
    aliceMessages.push(msg);
    console.log(`   📨 Alice received: "${msg.content}" (conversation: ${msg.conversationId.slice(-6)})`);
  });

  bobSocket.on('newMessage', (msg) => {
    bobMessages.push(msg);
    console.log(`   📨 Bob received: "${msg.content}" (conversation: ${msg.conversationId.slice(-6)})`);
  });

  carolSocket.on('newMessage', (msg) => {
    carolMessages.push(msg);
    console.log(`   📨 Carol received: "${msg.content}" (conversation: ${msg.conversationId.slice(-6)})`);
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test scenario: Alice sends to Bob, then Alice sends to Carol
  console.log('\n4️⃣  Testing message isolation...\n');

  console.log('   Alice → Bob: "Hey Bob, this is private"');
  aliceSocket.emit('sendMessage', {
    conversationId: aliceBobConv._id,
    content: 'Hey Bob, this is private',
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log('   Alice → Carol: "Hey Carol, different conversation"');
  aliceSocket.emit('sendMessage', {
    conversationId: aliceCarolConv._id,
    content: 'Hey Carol, different conversation',
  });

  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log('   Bob → Alice: "Got it Alice!"');
  bobSocket.emit('sendMessage', {
    conversationId: aliceBobConv._id,
    content: 'Got it Alice!',
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify results
  console.log('\n5️⃣  Verification Results:\n');
  
  console.log(`   Alice received ${aliceMessages.length} messages total`);
  console.log(`   Bob received ${bobMessages.length} messages total`);
  console.log(`   Carol received ${carolMessages.length} messages total`);

  // Check correct isolation
  const aliceBobMessages = aliceMessages.filter(m => m.conversationId === aliceBobConv._id);
  const aliceCarolMessages = aliceMessages.filter(m => m.conversationId === aliceCarolConv._id);
  const bobReceivedCorrect = bobMessages.every(m => m.conversationId === aliceBobConv._id);
  const carolReceivedCorrect = carolMessages.every(m => m.conversationId === aliceCarolConv._id);

  console.log(`\n   ✅ Alice received ${aliceBobMessages.length} messages in Alice-Bob conversation`);
  console.log(`   ✅ Alice received ${aliceCarolMessages.length} messages in Alice-Carol conversation`);
  console.log(`   ${bobReceivedCorrect ? '✅' : '❌'} Bob only received messages from Alice-Bob conversation`);
  console.log(`   ${carolReceivedCorrect ? '✅' : '❌'} Carol only received messages from Alice-Carol conversation`);

  if (bobMessages.length === 2 && carolMessages.length === 1 && bobReceivedCorrect && carolReceivedCorrect) {
    console.log('\n✅ Chat isolation test PASSED! Messages are properly separated.\n');
  } else {
    console.log('\n❌ Chat isolation test FAILED! Messages leaked between conversations.\n');
  }

  // Cleanup
  aliceSocket.disconnect();
  bobSocket.disconnect();
  carolSocket.disconnect();
  
  process.exit(0);
}

testChatIsolation().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
