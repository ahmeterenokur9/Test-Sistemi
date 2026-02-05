import { db, collection, addDoc } from './firebase.js';

let questions = [];

const questionsContainer = document.getElementById('questionsContainer');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const saveTestBtn = document.getElementById('saveTestBtn');
const testTitleInput = document.getElementById('testTitle');

// Yeni soru ekleme
addQuestionBtn.addEventListener('click', () => {
    const questionIndex = questions.length;
    const div = document.createElement('div');
    div.className = 'questionBlock';
    div.innerHTML = `
        <h3>Soru ${questionIndex + 1}</h3>
        <input type="text" placeholder="Soru metni" class="questionText"><br>
        <input type="text" placeholder="Seçenek A" class="optionA"><br>
        <input type="text" placeholder="Seçenek B" class="optionB"><br>
        <input type="text" placeholder="Seçenek C" class="optionC"><br>
        <input type="text" placeholder="Seçenek D" class="optionD"><br>
        <label>Doğru Cevap:</label>
        <select class="correctAnswer">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
        </select><br>
        <label>Puan:</label>
        <input type="number" value="10" class="points">
        <hr>
    `;
    questionsContainer.appendChild(div);
    questions.push(div);
});

// Testi Firestore’a kaydet
saveTestBtn.addEventListener('click', async () => {
    const testTitle = testTitleInput.value.trim();
    if(!testTitle || questions.length === 0){
        alert("Başlık ve en az 1 soru gerekli!");
        return;
    }

    try {
        // Testi ekle
        const testRef = await addDoc(collection(db, "tests"), {
            title: testTitle,
            createdAt: new Date()
        });

        // Soruları ekle
        for(const qDiv of questions){
            const questionText = qDiv.querySelector('.questionText').value;
            const options = [
                qDiv.querySelector('.optionA').value,
                qDiv.querySelector('.optionB').value,
                qDiv.querySelector('.optionC').value,
                qDiv.querySelector('.optionD').value
            ];
            const correctAnswer = qDiv.querySelector('.correctAnswer').value;
            const points = parseInt(qDiv.querySelector('.points').value);

            await addDoc(collection(db, "questions"), {
                testId: testRef.id,
                questionText,
                options,
                correctAnswer,
                points
            });
        }

        alert("Test ve sorular başarıyla kaydedildi!");
        location.reload();
    } catch (error) {
        console.error("Hata:", error);
        alert("Bir hata oluştu. Konsolu kontrol et.");
    }
});
