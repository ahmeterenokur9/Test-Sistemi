const firebaseConfig = {
  apiKey: "AIzaSyD_-8DIN3XOOZeHdzf4C5ciuwee1XI2gVo",
  authDomain: "test-sistemi-9d7bc.firebaseapp.com",
  projectId: "test-sistemi-9d7bc",
  storageBucket: "test-sistemi-9d7bc.firebasestorage.app",
  messagingSenderId: "112988292860",
  appId: "1:112988292860:web:a2f95ca908d5a01daff979",
  measurementId: "G-BWH1XQXJC1"
};

// Firebase başlat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
window.db = db;
