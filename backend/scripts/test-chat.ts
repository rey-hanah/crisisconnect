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
      console.log('✅ Socket connected:', socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      reject(error);
    });
  });
}

async function testChat() {
  console.log('\n🧪 Testing WebSocket Chat Functionality\n');

  // Login as Alice and Bob
  console.log('1️⃣  Logging in as Alice and Bob...');
  const aliceToken = await login('alice@demo.com', 'demo123');
  const bobToken = await login('bob@demo.com', 'demo123');
  console.log('   ✅ Both users logged in');

  // Get Alice's user ID
  const aliceMe = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  }).then((r) => r.json());
  const bobMe = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${bobToken}` },
  }).then((r) => r.json());

  console.log(`   Alice ID: ${aliceMe.id}`);
  console.log(`   Bob ID: ${bobMe.id}`);

  // Check for existing conversation
  console.log('\n2️⃣  Checking for existing conversation...');
  let aliceConvs = await getConversations(aliceToken);
  let conversation = aliceConvs.find(
    (c: any) =>
      c.participant1._id === bobMe.id || c.participant2._id === bobMe.id,
  );

  if (!conversation) {
    console.log('   No existing conversation, creating one...');
    conversation = await createConversation(aliceToken, bobMe.id);
  }
  console.log(`   ✅ Conversation ID: ${conversation._id}`);

  // Connect both sockets
  console.log('\n3️⃣  Connecting WebSockets...');
  const aliceSocket = await connectSocket(aliceToken);
  const bobSocket = await connectSocket(bobToken);
  console.log('   ✅ Both sockets connected');

  // Set up message listeners
  const aliceMessages: any[] = [];
  const bobMessages: any[] = [];

  aliceSocket.on('newMessage', (msg) => {
    console.log(`   📨 Alice received: "${msg.content}"`);
    aliceMessages.push(msg);
  });

  bobSocket.on('newMessage', (msg) => {
    console.log(`   📨 Bob received: "${msg.content}"`);
    bobMessages.push(msg);
  });

  // Send messages
  console.log('\n4️⃣  Testing message sending...');

  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('   Alice sends: "Hello Bob!"');
  aliceSocket.emit('sendMessage', {
    conversationId: conversation._id,
    content: 'Hello Bob!',
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('   Bob sends: "Hi Alice, how are you?"');
  bobSocket.emit('sendMessage', {
    conversationId: conversation._id,
    content: 'Hi Alice, how are you?',
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('   Alice sends: "I\'m good, thanks!"');
  aliceSocket.emit('sendMessage', {
    conversationId: conversation._id,
    content: "I'm good, thanks!",
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Verify messages
  console.log('\n5️⃣  Verifying message delivery...');
  console.log(`   Alice received ${aliceMessages.length} messages`);
  console.log(`   Bob received ${bobMessages.length} messages`);

  // Fetch from database
  const dbMessages = await fetch(`${API}/chat/${conversation._id}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  }).then((r) => r.json());

  console.log(`   Database has ${dbMessages.length} messages`);

  // Disconnect
  console.log('\n6️⃣  Cleaning up...');
  aliceSocket.disconnect();
  bobSocket.disconnect();

  console.log('\n✅ Chat test completed successfully!\n');
  process.exit(0);
}

testChat().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
