// firebase.js - compat sürümü kullanıyor (9.x compat), global "firebase" objesi üzerinden erişim
// NOT: create-test.html içinde compat CDN scriptleri yüklendiğinden bu dosya doğrudan çalışacaktır.

const firebaseConfig = {
  apiKey: "AIzaSyD_-8DIN3XOOZeHdzf4C5ciuwee1XI2gVo",
  authDomain: "test-sistemi-9d7bc.firebaseapp.com",
  projectId: "test-sistemi-9d7bc",
  storageBucket: "test-sistemi-9d7bc.firebasestorage.app",
  messagingSenderId: "112988292860",
  appId: "1:112988292860:web:a2f95ca908d5a01daff979",
  measurementId: "G-BWH1XQXJC1"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // zaten başlatıldıysa
}

const db = firebase.firestore();

// Global erişim (diğer scriptler doğrudan db kullanabilir)
window.db = db;
window.firebaseApp = firebase;
