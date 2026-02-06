// Global değişkenler
let allTests = [];
let allNotes = [];
let currentQuestions = [];
let currentTestId = null;
let currentQuestionType = 'multiple_choice';
let darkMode = false;
let piggyBankAmount = 0;

// Firebase'den kumbara değerini yükle
async function loadPiggyBank() {
  try {
    const doc = await db.collection('settings').doc('piggyBank').get();
    if (doc.exists) {
      piggyBankAmount = doc.data().amount || 0;
    } else {
      // İlk kez yükleniyorsa, varsayılan değer 0 ile oluştur
      await db.collection('settings').doc('piggyBank').set({ amount: 0 });
      piggyBankAmount = 0;
    }
    updatePiggyBankDisplay();
  } catch (err) {
    console.error('Kumbara yüklenemedi:', err);
    piggyBankAmount = 0;
    updatePiggyBankDisplay();
  }
}

// Kumbara gösterimini güncelle
function updatePiggyBankDisplay() {
  const piggyElement = document.getElementById('piggyBankAmount');
  if (piggyElement) {
    piggyElement.textContent = piggyBankAmount.toLocaleString('tr-TR');
  }
}

// Firebase'den testleri yükle
async function loadTests() {
  const testsContainer = document.getElementById('testsContainer');
  testsContainer.innerHTML = '<p style="color:#94a3b8">Testler yükleniyor...</p>';
  
  try {
    const snapshot = await db.collection('tests').orderBy('createdAt', 'desc').get();
    allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTestsList();
  } catch (err) {
    console.error(err);
    testsContainer.innerHTML = '<p style="color:#ef4444">Testler yüklenemedi</p>';
  }
}

// Firebase'den notları yükle
async function loadNotes() {
  const notesContainer = document.getElementById('notesContainer');
  notesContainer.innerHTML = '<p style="color:#94a3b8">Notlar yükleniyor...</p>';
  
  try {
    const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').get();
    allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNotesList();
  } catch (err) {
    console.error(err);
    notesContainer.innerHTML = '<p style="color:#ef4444">Notlar yüklenemedi</p>';
  }
}

function renderTestsList() {
  const testsContainer = document.getElementById('testsContainer');
  if (allTests.length === 0) {
    testsContainer.innerHTML = '<p style="color:#94a3b8">Henüz test eklenmemiş</p>';
    return;
  }
  testsContainer.innerHTML = allTests.map(t => {
    const totalQ = t.questions?.length || 0;
    const totalAttempts = t.attempts?.length || 0;
    const typeLabel = t.questionType === 'fill_blank' ? 'Boşluk Doldurma' : 'Çoktan Seçmeli';
    const typeIcon = t.questionType === 'fill_blank' ? '✏️' : '📝';
    
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 style="margin:0 0 4px 0; font-size:16px">${t.title}</h3>
            <span style="font-size:12px; color:var(--muted)">${typeIcon} ${typeLabel}</span>
          </div>
          <div class="stats-badge">
            <strong>${totalQ}</strong> soru<br>
            <strong>${totalAttempts}</strong> çözüm
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px; flex-wrap: wrap;">
          <button class="btn primary" style="flex:1; min-width: 120px;" onclick="startTest('${t.id}')">
            ▶️ Başla
          </button>
          ${totalAttempts > 0 ? `
            <button class="btn outline" style="flex:1; min-width: 120px;" onclick="previewTest('${t.id}')">
              👁️ Ön İzleme
            </button>
          ` : ''}
          <button class="btn delete-btn" onclick="deleteTest('${t.id}')" title="Sil">
            <span style="font-size: 16px;">🗑</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderNotesList() {
  const notesContainer = document.getElementById('notesContainer');
  if (allNotes.length === 0) {
    notesContainer.innerHTML = '<p style="color:var(--muted)">Henüz not eklenmemiş</p>';
    return;
  }
  notesContainer.innerHTML = allNotes.map(n => {
    const date = n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : 'Tarih yok';
    return `
      <div class="note-card">
        <div class="note-header">
          <h4>${n.title}</h4>
          <button class="btn delete-btn" onclick="deleteNote('${n.id}')" title="Sil">
            <span style="font-size: 14px;">🗑</span>
          </button>
        </div>
        <p class="note-content">${n.content}</p>
        <div class="note-footer">
          <span class="note-date">📅 ${date}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Test ön izleme fonksiyonu
async function previewTest(testId) {
  const test = allTests.find(t => t.id === testId);
  if (!test) return;

  const workArea = document.getElementById('workArea');
  const welcome = document.getElementById('welcome');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');

  welcome.classList.add('hidden');
  solveArea.classList.add('hidden');
  resultArea.classList.remove('hidden');

  // Son çözümü al
  const lastAttempt = test.attempts && test.attempts.length > 0 
    ? test.attempts[test.attempts.length - 1] 
    : null;

  if (!lastAttempt) {
    resultArea.innerHTML = '<p>Henüz çözüm bulunamadı.</p>';
    return;
  }

  const userAnswers = lastAttempt.answers || {};
  const score = lastAttempt.score || 0;
  const total = test.questions?.length || 0;

  let previewHTML = `
    <div class="preview-header">
      <h2 style="margin:0 0 8px 0">${test.title} - Ön İzleme</h2>
      <div class="preview-score">
        <div class="score-circle ${score >= total * 0.7 ? 'success' : score >= total * 0.5 ? 'warning' : 'danger'}">
          <span class="score-number">${score}</span>
          <span class="score-total">/ ${total}</span>
        </div>
        <p class="score-text">Toplam Puan</p>
      </div>
    </div>
    <div class="preview-questions">
  `;

  test.questions.forEach((q, idx) => {
    const userAnswer = userAnswers[idx];
    let isCorrect = false;
    
    if (test.questionType === 'fill_blank') {
      // Büyük küçük harf duyarsız karşılaştırma
      isCorrect = (userAnswer || '').toLowerCase().trim() === (q.correct || '').toLowerCase().trim();
    } else {
      isCorrect = userAnswer === q.correct;
    }
    
    const statusClass = isCorrect ? 'correct' : 'incorrect';
    const statusIcon = isCorrect ? '✓' : '✗';
    const statusText = isCorrect ? 'Doğru' : 'Yanlış';

    previewHTML += `
      <div class="preview-question ${statusClass}">
        <div class="preview-question-header">
          <div class="question-number">Soru ${idx + 1}</div>
          <div class="question-status ${statusClass}">
            <span class="status-icon">${statusIcon}</span>
            <span>${statusText}</span>
          </div>
        </div>
        <div class="question-text">${q.text}</div>
    `;

    if (test.questionType === 'multiple_choice') {
      previewHTML += '<div class="preview-options">';
      ['A', 'B', 'C', 'D'].forEach(opt => {
        const isUserAnswer = userAnswer === opt;
        const isCorrectAnswer = q.correct === opt;
        let optClass = 'preview-option';
        
        if (isCorrectAnswer) {
          optClass += ' correct-answer';
        }
        if (isUserAnswer && !isCorrect) {
          optClass += ' wrong-answer';
        }
        if (isUserAnswer) {
          optClass += ' user-selected';
        }

        const label = isCorrectAnswer ? 
          `<span class="option-label correct">✓ Doğru Cevap</span>` : 
          isUserAnswer ? 
            `<span class="option-label wrong">Sizin Cevabınız</span>` : 
            '';

        previewHTML += `
          <div class="${optClass}">
            <div class="option-content">
              <strong>${opt})</strong> ${q.options[opt]}
            </div>
            ${label}
          </div>
        `;
      });
      previewHTML += '</div>';
    } else if (test.questionType === 'fill_blank') {
      const correctAnswer = q.correct || '';
      const userAnswerText = userAnswer || '';
      
      previewHTML += `
        <div class="preview-blank-answer">
          <div class="blank-row ${isCorrect ? 'correct-blank' : 'incorrect-blank'}">
            <strong>Sizin Cevabınız:</strong>
            <span class="user-blank-answer">${userAnswerText || '(Boş bırakıldı)'}</span>
          </div>
          ${!isCorrect ? `
            <div class="blank-row correct-blank">
              <strong>Doğru Cevap:</strong>
              <span class="correct-blank-answer">${correctAnswer}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    previewHTML += '</div>';
  });

  previewHTML += `
    </div>
    <div style="margin-top:24px; text-align:center">
      <button class="btn outline" onclick="closePreview()">
        ← Geri Dön
      </button>
    </div>
  `;

  resultArea.innerHTML = previewHTML;
}

function closePreview() {
  const welcome = document.getElementById('welcome');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');

  welcome.classList.remove('hidden');
  solveArea.classList.add('hidden');
  resultArea.classList.add('hidden');
}

function startTest(testId) {
  const test = allTests.find(t => t.id === testId);
  if (!test || !test.questions || test.questions.length === 0) {
    alert('Bu testte soru bulunmuyor!');
    return;
  }

  currentTestId = testId;
  const welcome = document.getElementById('welcome');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');

  welcome.classList.add('hidden');
  resultArea.classList.add('hidden');
  solveArea.classList.remove('hidden');

  let html = `<h2>${test.title}</h2>`;
  test.questions.forEach((q, i) => {
    html += `
      <div class="solve-card">
        <div class="solve-q-header">
          <span class="solve-q-number">Soru ${i + 1}</span>
          <span class="solve-q-points">${q.points || 10} Puan</span>
        </div>
        <div class="solve-q-text">${q.text}</div>
    `;
    
    if (test.questionType === 'multiple_choice') {
      html += `<div class="solve-options">`;
      ['A', 'B', 'C', 'D'].forEach(opt => {
        html += `
          <div class="solve-opt">
            <input type="radio" id="q${i}_${opt}" name="q${i}" value="${opt}" />
            <label for="q${i}_${opt}">
              <strong>${opt})</strong> ${q.options[opt]}
            </label>
          </div>
        `;
      });
      html += `</div>`;
    } else if (test.questionType === 'fill_blank') {
      html += `
        <div class="solve-blank-input">
          <input 
            type="text" 
            class="blank-answer" 
            data-question-index="${i}"
            placeholder="Cevabınızı yazın..."
          />
        </div>
      `;
    }
    
    html += `</div>`;
  });

  html += `
    <button class="btn success" style="width:100%; margin-top:16px" onclick="submitTest()">
      ✓ Testi Bitir
    </button>
  `;
  solveArea.innerHTML = html;
}

async function submitTest() {
  const test = allTests.find(t => t.id === currentTestId);
  if (!test) return;

  const answers = {};
  let score = 0;

  if (test.questionType === 'multiple_choice') {
    test.questions.forEach((q, i) => {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected) {
        answers[i] = selected.value;
        if (selected.value === q.correct) score++;
      }
    });
  } else if (test.questionType === 'fill_blank') {
    test.questions.forEach((q, i) => {
      const input = document.querySelector(`input[data-question-index="${i}"]`);
      if (input) {
        const userAnswer = input.value.trim();
        answers[i] = userAnswer;
        // Büyük küçük harf duyarsız karşılaştırma
        if (userAnswer.toLowerCase() === (q.correct || '').toLowerCase()) {
          score++;
        }
      }
    });
  }

  const attemptData = {
    answers,
    score,
    timestamp: new Date().toISOString()
  };

  try {
    const attempts = test.attempts || [];
    attempts.push(attemptData);
    await db.collection('tests').doc(currentTestId).update({ attempts });
    
    showResult(score, test.questions.length);
    await loadTests();
  } catch (err) {
    console.error(err);
    alert('Sonuç kaydedilemedi!');
  }
}

function showResult(score, total) {
  const resultArea = document.getElementById('resultArea');
  const solveArea = document.getElementById('solveArea');
  
  solveArea.classList.add('hidden');
  resultArea.classList.remove('hidden');

  const percentage = ((score / total) * 100).toFixed(0);
  let resultClass = 'poor';
  let emoji = '😢';
  let message = 'Daha fazla çalışmalısın!';

  if (percentage >= 90) {
    resultClass = 'excellent';
    emoji = '🎉';
    message = 'Mükemmel bir performans!';
  } else if (percentage >= 70) {
    resultClass = 'good';
    emoji = '😊';
    message = 'Harika bir performans!';
  } else if (percentage >= 50) {
    resultClass = 'average';
    emoji = '🙂';
    message = 'Fena değil, biraz daha gayret!';
  }

  resultArea.innerHTML = `
    <div class="result-header">
      <div style="font-size:80px; margin-bottom:20px">${emoji}</div>
      <h2>Test Tamamlandı!</h2>
      <p style="color:var(--muted); margin:0 0 32px 0">${message}</p>
      
      <div class="score-display">
        <div class="score-big">${score}</div>
        <div class="score-divider">/</div>
        <div class="score-total-big">${total}</div>
      </div>
      
      <div class="result-percentage ${resultClass}">
        <strong>%${percentage}</strong> Başarı
      </div>

      <button class="btn outline" style="margin-top:32px" onclick="backToHome()">
        ← Ana Sayfaya Dön
      </button>
    </div>
  `;
}

function backToHome() {
  const welcome = document.getElementById('welcome');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');

  welcome.classList.remove('hidden');
  solveArea.classList.add('hidden');
  resultArea.classList.add('hidden');
  currentTestId = null;
}

async function deleteTest(testId) {
  if (!confirm('Bu testi silmek istediğinize emin misiniz?')) return;
  
  try {
    await db.collection('tests').doc(testId).delete();
    await loadTests();
    if (currentTestId === testId) {
      backToHome();
    }
  } catch (err) {
    console.error(err);
    alert('Test silinemedi!');
  }
}

async function deleteNote(noteId) {
  if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
  
  try {
    await db.collection('notes').doc(noteId).delete();
    await loadNotes();
  } catch (err) {
    console.error(err);
    alert('Not silinemedi!');
  }
}

// Modal İşlemleri
const modal = document.getElementById('modal');
const typeModal = document.getElementById('typeModal');
const noteModal = document.getElementById('noteModal');
const modalClose = document.getElementById('modalClose');
const typeModalClose = document.getElementById('typeModalClose');
const noteModalClose = document.getElementById('noteModalClose');

// Üst panel butonları
document.getElementById('createTestBtn').addEventListener('click', () => {
  typeModal.classList.remove('hidden');
});

document.getElementById('createNoteBtn').addEventListener('click', () => {
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteContent').value = '';
  noteModal.classList.remove('hidden');
});

document.getElementById('viewNotesBtn').addEventListener('click', () => {
  showNotesPanel();
});

document.getElementById('darkModeToggle').addEventListener('click', () => {
  toggleDarkMode();
});

typeModalClose.addEventListener('click', () => {
  typeModal.classList.add('hidden');
});

modalClose.addEventListener('click', () => {
  modal.classList.add('hidden');
});

noteModalClose.addEventListener('click', () => {
  noteModal.classList.add('hidden');
});

// Gece modu toggle
function toggleDarkMode() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  
  const icon = document.querySelector('#darkModeToggle .btn-icon');
  icon.textContent = darkMode ? '☀️' : '🌙';
  
  // LocalStorage'a kaydet
  localStorage.setItem('darkMode', darkMode);
}

// Sayfa yüklendiğinde gece modu tercihini kontrol et
function loadDarkModePreference() {
  const savedMode = localStorage.getItem('darkMode');
  if (savedMode === 'true') {
    darkMode = true;
    document.body.classList.add('dark-mode');
    const icon = document.querySelector('#darkModeToggle .btn-icon');
    if (icon) icon.textContent = '☀️';
  }
}

// Notlar panelini göster
function showNotesPanel() {
  const welcome = document.getElementById('welcome');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');

  welcome.classList.add('hidden');
  solveArea.classList.add('hidden');
  resultArea.classList.remove('hidden');

  resultArea.innerHTML = `
    <div class="notes-panel">
      <div class="notes-panel-header">
        <h2>Notlarım</h2>
        <button class="btn outline" onclick="backToHome()">
          ← Geri Dön
        </button>
      </div>
      <div id="notesContainer" class="notes-list"></div>
    </div>
  `;

  loadNotes();
}

// Not kaydet
document.getElementById('saveNote').addEventListener('click', async () => {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();

  if (!title) {
    alert('Lütfen not başlığı girin!');
    return;
  }

  if (!content) {
    alert('Lütfen not içeriği girin!');
    return;
  }

  try {
    await db.collection('notes').add({
      title,
      content,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    noteModal.classList.add('hidden');
    alert('Not başarıyla kaydedildi!');
    
    // Eğer notlar paneli açıksa, yeniden yükle
    if (!document.getElementById('welcome').classList.contains('hidden') === false) {
      await loadNotes();
    }
  } catch (err) {
    console.error(err);
    alert('Not kaydedilemedi!');
  }
});

// Soru tipi seçim
document.getElementById('selectMultipleChoice').addEventListener('click', () => {
  openTestModal('multiple_choice');
});

document.getElementById('selectFillBlank').addEventListener('click', () => {
  openTestModal('fill_blank');
});

function openTestModal(type) {
  currentQuestionType = type;
  currentQuestions = [];
  
  document.getElementById('mTestTitle').value = '';
  document.getElementById('mBulkArea').value = '';
  document.getElementById('modalQuestions').innerHTML = '';
  
  typeModal.classList.add('hidden');
  
  const typeText = type === 'fill_blank' ? 'Boşluk Doldurma' : 'Çoktan Seçmeli';
  document.getElementById('modalTitle').textContent = `Yeni ${typeText} Test Oluştur`;
  
  modal.classList.remove('hidden');
}

document.getElementById('mAddQuestion').addEventListener('click', () => {
  addQuestionBlock();
});

document.getElementById('mImportExample').addEventListener('click', () => {
  const exampleJSON = currentQuestionType === 'multiple_choice' 
    ? `[
  {
    "text": "Türkiye'nin başkenti neresidir?",
    "options": {"A": "İstanbul", "B": "Ankara", "C": "İzmir", "D": "Bursa"},
    "correct": "B",
    "points": 10
  },
  {
    "text": "Dünyanın en büyük okyanusu hangisidir?",
    "options": {"A": "Atlas", "B": "Hint", "C": "Pasifik", "D": "Arktik"},
    "correct": "C",
    "points": 10
  }
]`
    : `[
  {
    "text": "Türkiye'nin başkenti _____ şehridir.",
    "correct": "Ankara",
    "points": 10
  },
  {
    "text": "Dünyanın en büyük okyanusu _____ Okyanusu'dur.",
    "correct": "Pasifik",
    "points": 10
  }
]`;
  
  document.getElementById('mBulkArea').value = exampleJSON;
});

document.getElementById('mPasteBulk').addEventListener('click', () => {
  const bulkText = document.getElementById('mBulkArea').value.trim();
  if (!bulkText) {
    alert('Lütfen JSON formatında veri girin!');
    return;
  }

  try {
    const parsed = JSON.parse(bulkText);
    if (!Array.isArray(parsed)) {
      throw new Error('Veri bir dizi olmalı');
    }

    currentQuestions = [];
    document.getElementById('modalQuestions').innerHTML = '';

    parsed.forEach(q => {
      if (currentQuestionType === 'multiple_choice') {
        if (!q.text || !q.options || !q.correct) {
          throw new Error('Her soruda text, options ve correct alanları olmalı');
        }
        currentQuestions.push({
          text: q.text,
          options: q.options,
          correct: q.correct,
          points: q.points || 10
        });
      } else if (currentQuestionType === 'fill_blank') {
        if (!q.text || !q.correct) {
          throw new Error('Her soruda text ve correct alanları olmalı');
        }
        currentQuestions.push({
          text: q.text,
          correct: q.correct,
          points: q.points || 10
        });
      }
    });

    renderQuestions();
    alert(`${currentQuestions.length} soru başarıyla aktarıldı!`);
  } catch (err) {
    alert('JSON formatı hatalı: ' + err.message);
  }
});

function addQuestionBlock(qData = null) {
  const index = currentQuestions.length;
  
  if (currentQuestionType === 'multiple_choice') {
    const qObj = qData || {
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      correct: 'A',
      points: 10
    };
    currentQuestions.push(qObj);
  } else if (currentQuestionType === 'fill_blank') {
    const qObj = qData || {
      text: '',
      correct: '',
      points: 10
    };
    currentQuestions.push(qObj);
  }
  
  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById('modalQuestions');
  container.innerHTML = currentQuestions.map((q, i) => {
    if (currentQuestionType === 'multiple_choice') {
      return `
        <div class="qblock" data-index="${i}">
          <div class="qblock-header">
            <strong>Soru ${i + 1}</strong>
            <button class="btn delete-btn" onclick="removeQuestion(${i})" title="Sil">
              🗑
            </button>
          </div>
          <textarea placeholder="Soru metni..." onchange="updateQuestion(${i}, 'text', this.value)">${q.text}</textarea>
          <div class="options-grid">
            ${['A', 'B', 'C', 'D'].map(opt => `
              <input 
                type="text" 
                placeholder="Şık ${opt}" 
                value="${q.options[opt]}"
                onchange="updateQuestionOption(${i}, '${opt}', this.value)"
              />
            `).join('')}
          </div>
          <div class="question-meta">
            <label>
              Doğru Cevap:
              <select onchange="updateQuestion(${i}, 'correct', this.value)">
                ${['A', 'B', 'C', 'D'].map(opt => 
                  `<option value="${opt}" ${q.correct === opt ? 'selected' : ''}>${opt}</option>`
                ).join('')}
              </select>
            </label>
            <label>
              Puan:
              <input 
                type="number" 
                value="${q.points}" 
                min="1" 
                onchange="updateQuestion(${i}, 'points', parseInt(this.value))"
              />
            </label>
          </div>
        </div>
      `;
    } else if (currentQuestionType === 'fill_blank') {
      return `
        <div class="qblock" data-index="${i}">
          <div class="qblock-header">
            <strong>Soru ${i + 1}</strong>
            <button class="btn delete-btn" onclick="removeQuestion(${i})" title="Sil">
              🗑
            </button>
          </div>
          <textarea placeholder="Soru metni (boşluk için ___ kullanın)..." onchange="updateQuestion(${i}, 'text', this.value)">${q.text}</textarea>
          <div class="blank-input">
            <input 
              type="text" 
              placeholder="Doğru cevap..." 
              value="${q.correct}"
              onchange="updateQuestion(${i}, 'correct', this.value)"
            />
            <p class="blank-hint">İpucu: Boşlukta görünecek doğru cevabı yazın</p>
          </div>
          <div class="question-meta">
            <label>
              Puan:
              <input 
                type="number" 
                value="${q.points}" 
                min="1" 
                onchange="updateQuestion(${i}, 'points', parseInt(this.value))"
              />
            </label>
          </div>
        </div>
      `;
    }
  }).join('');
}

function updateQuestion(index, field, value) {
  if (currentQuestions[index]) {
    currentQuestions[index][field] = value;
  }
}

function updateQuestionOption(index, optKey, value) {
  if (currentQuestions[index] && currentQuestions[index].options) {
    currentQuestions[index].options[optKey] = value;
  }
}

function removeQuestion(index) {
  currentQuestions.splice(index, 1);
  renderQuestions();
}

document.getElementById('mReset').addEventListener('click', () => {
  if (confirm('Tüm girişleri sıfırlamak istediğinize emin misiniz?')) {
    currentQuestions = [];
    document.getElementById('mTestTitle').value = '';
    document.getElementById('mBulkArea').value = '';
    renderQuestions();
  }
});

document.getElementById('mSaveTest').addEventListener('click', async () => {
  const title = document.getElementById('mTestTitle').value.trim();
  
  if (!title) {
    alert('Lütfen test başlığı girin!');
    return;
  }
  
  if (currentQuestions.length === 0) {
    alert('En az 1 soru eklemelisiniz!');
    return;
  }

  // Soruların dolu olup olmadığını kontrol et
  for (let i = 0; i < currentQuestions.length; i++) {
    const q = currentQuestions[i];
    if (!q.text.trim()) {
      alert(`Soru ${i + 1}'in metni boş olamaz!`);
      return;
    }
    
    if (currentQuestionType === 'multiple_choice') {
      if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
        alert(`Soru ${i + 1}'in tüm şıkları doldurulmalı!`);
        return;
      }
    } else if (currentQuestionType === 'fill_blank') {
      if (!q.correct.trim()) {
        alert(`Soru ${i + 1}'in doğru cevabı boş olamaz!`);
        return;
      }
    }
  }

  try {
    await db.collection('tests').add({
      title,
      questions: currentQuestions,
      questionType: currentQuestionType,
      attempts: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    modal.classList.add('hidden');
    alert('Test başarıyla oluşturuldu!');
    await loadTests();
  } catch (err) {
    console.error(err);
    alert('Test kaydedilemedi!');
  }
});

// Sayfa yüklendiğinde
window.addEventListener('DOMContentLoaded', () => {
  loadDarkModePreference();
  loadTests();
  loadPiggyBank(); // Kumbara değerini yükle
});
