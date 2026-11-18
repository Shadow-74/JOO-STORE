// ==========================================
// JOO STORE - Firebase Cloud Sync (firebase-db.js)
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCsSmn55vWncldIMXQgK0khb4XmEwzjNZg",
  authDomain: "joo-store-2362d.firebaseapp.com",
  projectId: "joo-store-2362d",
  storageBucket: "joo-store-2362d.firebasestorage.app",
  messagingSenderId: "675620019799",
  appId: "1:675620019799:web:c6f2796339775a95e90d12",
  measurementId: "G-Y2451T1C6K"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// مزامنة العملاء أونلاين في الوقت الفعلي
function syncUsersFromCloud(onUpdateCallback) {
    db.collection('users').onSnapshot((snapshot) => {
        const cloudUsers = [];
        snapshot.forEach((doc) => {
            cloudUsers.push({ id: doc.id, ...doc.data() });
        });
        cloudUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem('joo_all_users', JSON.stringify(cloudUsers));
        if (typeof onUpdateCallback === 'function') {
            onUpdateCallback(cloudUsers);
        }
    }, (error) => {
        console.error("Firebase Sync Error:", error);
    });
}

// حفظ أو تحديث بيانات عميل على السحابة
async function saveUserToCloud(userObj) {
    try {
        await db.collection('users').doc(userObj.id).set(userObj, { merge: true });
    } catch (e) {
        console.error("Error saving user:", e);
    }
}

// حذف عميل من السحابة
async function deleteUserFromCloud(userId) {
    try {
        await db.collection('users').doc(userId).delete();
    } catch (e) {
        console.error("Error deleting user:", e);
    }
}
// إرسال رسالة تواصل من الصفحة الرئيسية إلى Firebase
async function sendContactMessageToCloud(msgObj) {
    try {
        await db.collection('messages').doc(msgObj.id).set(msgObj);
        return true;
    } catch (e) {
        console.error("Error sending message:", e);
        return false;
    }
}

// جلب ومزامنة الرسائل في لوحة الأدمن في الوقت الفعلي
function syncMessagesFromCloud(onUpdateCallback) {
    db.collection('messages').onSnapshot((snapshot) => {
        const cloudMessages = [];
        snapshot.forEach((doc) => {
            cloudMessages.push({ id: doc.id, ...doc.data() });
        });
        cloudMessages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem('joo_store_messages', JSON.stringify(cloudMessages));
        if (typeof onUpdateCallback === 'function') {
            onUpdateCallback(cloudMessages);
        }
    }, (error) => {
        console.error("Firebase Messages Sync Error:", error);
    });
}

// حذف رسالة من Firebase
async function deleteMessageFromCloud(msgId) {
    try {
        await db.collection('messages').doc(msgId).delete();
    } catch (e) {
        console.error("Error deleting message:", e);
    }
}