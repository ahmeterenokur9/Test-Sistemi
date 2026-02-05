// app.js

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD_-8DIN3XOOZeHdzf4C5ciuwee1XI2gVo",
  authDomain: "test-sistemi-9d7bc.firebaseapp.com",
  projectId: "test-sistemi-9d7bc",
  storageBucket: "test-sistemi-9d7bc.appspot.com",
  messagingSenderId: "112988292860",
  appId: "1:112988292860:web:a2f95ca908d5a01daff979"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModal');
const addQuestionBtn = document.getElementById('addQuestion');
const questionContainer = document.getElementById('questionContainer');
const saveTestBtn = document.getElementById('saveTest');
const testTitleInput = document.getElementById('testTitle');

// Question Blocks
let modalQuestionBlocks = [];

// ----------------- Functions -----------------

function openModal() {
    modal.classList.remove('hidden');
    if(modalQuestionBlocks.length === 0) addModalQuestion();
}

function closeModal() {
    modal.classList.add('hidden');
}

function addModalQuestion() {
    const questionIndex = modalQuestionBlocks.length + 1;

    const block = document.createElement('div');
    block.classList.add('question-block');

    block.innerHTML = `
        <label>Soru ${questionIndex}:</label>
        <input type="text" placeholder="Soru metni" class="questionText">
        <label>Şıklar (virgülle ayırın):</label>
        <input type="text" placeholder="Şık1, Şık2, Şık3, ..." class="optionsText">
        <label>Doğru şık:</label>
        <input type="text" placeholder="A, B, C, ..." class="correctOption">
    `;

    questionContainer.appendChild(block);
    modalQuestionBlocks.push(block);
}

async function saveTest() {
    const testTitle = testTitleInput.value.trim();
    if(!testTitle) {
        alert("Test başlığını girin!");
        return;
    }

    const questions = modalQuestionBlocks.map(block => {
        const qText = block.querySelector('.questionText').value.trim();
        const opts = block.querySelector('.optionsText').value.trim().split(',').map(s => s.trim());
        const correct = block.querySelector('.correctOption').value.trim().toUpperCase();
        return { question: qText, options: opts, correctAnswer: correct };
    });

    try {
        await addDoc(collection(db, "tests"), { title: testTitle, questions });
        alert("Test başarıyla kaydedildi!");
        closeModal();
        testTitleInput.value = "";
        questionContainer.innerHTML = "";
        modalQuestionBlocks = [];
    } catch (err) {
        console.error(err);
        alert("Bir hata oluştu, test kaydedilemedi!");
    }
}

// Load Tests (display test list)
async function loadTests() {
    const testsListContainer = document.getElementById('testsList');
    testsListContainer.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "tests"));
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const testDiv = document.createElement('div');
        testDiv.classList.add('test-item');
        testDiv.textContent = data.title;
        testsListContainer.appendChild(testDiv);
    });
}

// ----------------- Event Listeners -----------------
fab.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
addQuestionBtn.addEventListener('click', addModalQuestion);
saveTestBtn.addEventListener('click', saveTest);

// ----------------- Init -----------------
loadTests();
