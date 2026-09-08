const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;
let messaging = null;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
      });
      console.log('✅ Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    } else {
      firebaseApp = getApp();
    }
    messaging = getMessaging(firebaseApp);
  } else {
    console.warn('⚠️ Firebase service account file not found at:', serviceAccountPath);
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
}

/**
 * Send notification to a single device token
 * @param {string} token - FCM Device registration token
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const sendPushToDevice = async (token, { title, body, imageUrl, data = {} }) => {
  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized');
  }
  const message = {
    token,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {})
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    )
  };
  return await messaging.send(message);
};

/**
 * Send notification to multiple device tokens
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const sendMulticastPush = async (tokens, { title, body, imageUrl, data = {} }) => {
  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized');
  }
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }
  const message = {
    tokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {})
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    )
  };
  return await messaging.sendEachForMulticast(message);
};

/**
 * Send notification to a topic (e.g. 'all-students', 'teachers', 'college-123')
 * @param {string} topic - Topic name
 * @param {Object} payload - { title, body, imageUrl, data }
 */
const sendTopicPush = async (topic, { title, body, imageUrl, data = {} }) => {
  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized');
  }
  const message = {
    topic,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {})
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    )
  };
  return await messaging.send(message);
};

/**
 * Subscribe a token or array of tokens to a topic
 * @param {string|string[]} tokens - Registration token(s)
 * @param {string} topic - Topic name
 */
const subscribeToTopic = async (tokens, topic) => {
  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized');
  }
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  return await messaging.subscribeToTopic(tokenList, topic);
};

/**
 * Unsubscribe a token or array of tokens from a topic
 * @param {string|string[]} tokens - Registration token(s)
 * @param {string} topic - Topic name
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  if (!messaging) {
    throw new Error('Firebase Messaging is not initialized');
  }
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  return await messaging.unsubscribeFromTopic(tokenList, topic);
};

module.exports = {
  firebaseApp,
  messaging,
  sendPushToDevice,
  sendMulticastPush,
  sendTopicPush,
  subscribeToTopic,
  unsubscribeFromTopic
};
