(function(){
  // --- ELEMENTLER ---
  const db = window.db;
  
  // Tip seçim modalı
  const typeModal = document.getElementById('typeModal');
  const typeModalClose = document.getElementById('typeModalClose');
  const selectMultipleChoice = document.getElementById('selectMultipleChoice');
  const selectFillBlank = document.getElementById('selectFillBlank');
  
  // Ana modal
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const mTestTitle = document.getElementById('mTestTitle');
  const mAddQuestion = document.getElementById('mAddQuestion');
  const mSaveTest = document.getElementById('mSaveTest');
  const mReset = document.getElementById('mReset');
  const modalQuestions = document.getElementById('modalQuestions');
  
  const mBulkArea = document.getElementById('mBulkArea');
  const mPasteBulk = document.getElementById('mPasteBulk');
  const mImportExample = document.getElementById('mImportExample');

  const testsContainer = document.getElementById('testsContainer');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');
  const welcome = document.getElementById('welcome');

  let modalQuestionBlocks = [];
  let currentQuestions = [];
  let activeTestId = null;
  let currentTestType = 'multiple_choice'; // 'multiple_choice' veya 'fill_blank'

  // --- TIP SEÇÄ°M MODALI ---
  function openTypeModal() {
    typeModal.classList.remove('hidden');
  }

  function closeTypeModal() {
    typeModal.classList.add('hidden');
  }

  fab.onclick = openTypeModal;
  typeModalClose.onclick = closeTypeModal;

  selectMultipleChoice.onclick = () => {
    currentTestType = 'multiple_choice';
    closeTypeModal();
    openMainModal();
  };

  selectFillBlank.onclick = () => {
    currentTestType = 'fill_blank';
    closeTypeModal();
    openMainModal();
  };

  // --- ANA MODAL YÖNETİMİ ---
  function openMainModal() {
    if (currentTestType === 'multiple_choice') {
      modalTitle.textContent = 'Yeni Çoktan Seçmeli Test Oluştur';
    } else {
      modalTitle.textContent = 'Yeni Boşluk Doldurma Testi Oluştur';
    }
    modal.classList.remove('hidden');
    if (modalQuestionBlocks.length === 0) addModalQuestion();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  modalClose.onclick = closeModal;

  window.onclick = (e) => { 
    if (e.target === modal) closeModal();
    if (e.target === typeModal) closeTypeModal();
  };

  mReset.onclick = () => {
    if(confirm('Tüm formu sıfırlamak istediğine emin misin?')) {
      modalQuestions.innerHTML = '';
      modalQuestionBlocks = [];
      mTestTitle.value = '';
      addModalQuestion();
    }
  };

  // --- SORU EKLEME MANTIĞI ---
  function addModalQuestion(prefill = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'qblock';
    
    if (currentTestType === 'multiple_choice') {
      addMultipleChoiceQuestion(wrapper, prefill);
    } else {
      addFillBlankQuestion(wrapper, prefill);
    }

    modalQuestions.appendChild(wrapper);
    modalQuestionBlocks.push(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function addMultipleChoiceQuestion(wrapper, prefill) {
    const qText = prefill.questionText || '';
    const options = prefill.options || ['', '', '', ''];
    const correct = prefill.correctAnswer || 'A';
    const points = prefill.points || 10;

    wrapper.innerHTML = `
      <div class="qblock-header">
        <strong>Soru ${modalQuestionBlocks.length + 1}</strong>
        <button class="btn outline remove-q" style="color:var(--danger); border-color:var(--danger); padding:6px 12px; font-size:12px">Sil</button>
      </div>
      <input class="q_text" type="text" placeholder="Soru metnini yazın..." value="${qText}">
      <div class="options-grid">
        <input class="optA" placeholder="A Şıkkı" value="${options[0] || ''}">
        <input class="optB" placeholder="B Şıkkı" value="${options[1] || ''}">
        <input class="optC" placeholder="C Şıkkı" value="${options[2] || ''}">
        <input class="optD" placeholder="D Şıkkı" value="${options[3] || ''}">
      </div>
      <div class="question-meta">
        <span>Doğru Cevap: 
          <select class="correct_ans">
            <option value="A" ${correct==='A'?'selected':''}>A</option>
            <option value="B" ${correct==='B'?'selected':''}>B</option>
            <option value="C" ${correct==='C'?'selected':''}>C</option>
            <option value="D" ${correct==='D'?'selected':''}>D</option>
          </select>
        </span>
        <span>Puan: <input type="number" class="q_points" value="${points}" min="1"></span>
      </div>
    `;

    wrapper.querySelector('.remove-q').onclick = () => removeQuestion(wrapper);
  }

  function addFillBlankQuestion(wrapper, prefill) {
    const qText = prefill.questionText || '';
    const correctAnswer = prefill.correctAnswer || '';
    const points = prefill.points || 10;

    wrapper.innerHTML = `
      <div class="qblock-header">
        <strong>Soru ${modalQuestionBlocks.length + 1}</strong>
        <button class="btn outline remove-q" style="color:var(--danger); border-color:var(--danger); padding:6px 12px; font-size:12px">Sil</button>
      </div>
      <label style="font-size:13px; color:#475569; margin-bottom:6px; display:block">Soru Metni (boşlukları _____ ile belirtin)</label>
      <textarea class="q_text" placeholder="Örnek: Türkiye'nin başkenti _____'dır." rows="3">${qText}</textarea>
      <div class="blank-input">
        <label style="font-size:13px; font-weight:600; color:#856404; display:block; margin-bottom:4px">Doğru Cevap</label>
        <input type="text" class="correct_ans" placeholder="Örnek: Ankara" value="${correctAnswer}" style="width:100%; padding:8px; border:1px solid #ffc107; border-radius:4px">
        <div class="blank-hint">Büyük/küçük harf duyarlılığı yoktur</div>
      </div>
      <div class="question-meta">
        <span>Puan: <input type="number" class="q_points" value="${points}" min="1"></span>
      </div>
    `;

    wrapper.querySelector('.remove-q').onclick = () => removeQuestion(wrapper);
  }

  function removeQuestion(wrapper) {
    wrapper.remove();
    modalQuestionBlocks = modalQuestionBlocks.filter(b => b !== wrapper);
    updateQuestionNumbers();
  }

  function updateQuestionNumbers() {
    modalQuestionBlocks.forEach((b, i) => {
      b.querySelector('strong').textContent = `Soru ${i + 1}`;
    });
  }

  mAddQuestion.onclick = () => addModalQuestion();

  // --- TOPLU EKLEME (BULK IMPORT) ---
  mImportExample.onclick = () => {
    if (currentTestType === 'multiple_choice') {
      mBulkArea.value = `[
  {
    "questionText": "Gökyüzü ne renktir?",
    "options": ["Mavi", "Yeşil", "Kırmızı", "Sarı"],
    "correctAnswer": "A",
    "points": 10
  },
  {
    "questionText": "Türkiye'nin başkenti neresidir?",
    "options": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "correctAnswer": "B",
    "points": 10
  }
]`;
    } else {
      mBulkArea.value = `[
  {
    "questionText": "Türkiye'nin başkenti _____'dır.",
    "correctAnswer": "Ankara",
    "points": 10
  },
  {
    "questionText": "_____ elementinin sembolü H'dir.",
    "correctAnswer": "Hidrojen",
    "points": 10
  },
  {
    "questionText": "Bir üçgenin iç açıları toplamı _____ derecedir.",
    "correctAnswer": "180",
    "points": 10
  }
]`;
    }
  };

  mPasteBulk.onclick = () => {
    const val = mBulkArea.value.trim();
    if (!val) return alert("Lütfen önce kutuya veri yapıştırın.");
    
    try {
      const fn = new Function('return ' + val);
      const data = fn();
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          addModalQuestion({
            questionText: item.questionText || item.q,
            options: item.options || item.opts,
            correctAnswer: item.correctAnswer || item.ans,
            points: item.points || 10
          });
        });
        alert(`${data.length} soru başarıyla eklendi!`);
        mBulkArea.value = '';
      } else {
        alert("Hata: Girdiğiniz veri bir liste (array) olmalıdır.");
      }
    } catch (e) {
      alert("Format Hatası: Veriyi JSON veya JS Dizisi olarak kontrol edin.\n\n" + e.message);
    }
  };

  // --- TESTİ KAYDET (FIREBASE BATCH) ---
  mSaveTest.onclick = async () => {
    const title = mTestTitle.value.trim();
    if (!title) return alert("Lütfen teste bir başlık verin.");
    if (modalQuestionBlocks.length === 0) return alert("En az bir soru eklemelisiniz.");

    mSaveTest.disabled = true;
    mSaveTest.innerHTML = '<span class="btn-icon">⏳</span> Kaydediliyor...';

    try {
      const batch = db.batch();
      const testRef = db.collection('tests').doc();
      
      batch.set(testRef, {
        title: title,
        type: currentTestType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: modalQuestionBlocks.length,
        lastResult: null
      });

      modalQuestionBlocks.forEach(block => {
        const qRef = db.collection('questions').doc();
        
        if (currentTestType === 'multiple_choice') {
          batch.set(qRef, {
            testId: testRef.id,
            type: 'multiple_choice',
            questionText: block.querySelector('.q_text').value,
            options: [
              block.querySelector('.optA').value,
              block.querySelector('.optB').value,
              block.querySelector('.optC').value,
              block.querySelector('.optD').value
            ],
            correctAnswer: block.querySelector('.correct_ans').value,
            points: parseInt(block.querySelector('.q_points').value) || 0
          });
        } else {
          batch.set(qRef, {
            testId: testRef.id,
            type: 'fill_blank',
            questionText: block.querySelector('.q_text').value,
            correctAnswer: block.querySelector('.correct_ans').value,
            points: parseInt(block.querySelector('.q_points').value) || 0
          });
        }
      });

      await batch.commit();
      alert("Test başarıyla yayınlandı!");
      location.reload();
    } catch (err) {
      alert("Hata oluştu: " + err.message);
      mSaveTest.disabled = false;
      mSaveTest.innerHTML = '<span class="btn-icon">✓</span> Testi Yayınla';
    }
  };

  // --- TEST LİSTESİ VE SİLME ---
  async function loadTests() {
    testsContainer.innerHTML = '<p class="muted">Yükleniyor...</p>';
    const snapshot = await db.collection('tests').orderBy('createdAt', 'desc').get();
    testsContainer.innerHTML = '';

    if (snapshot.empty) {
      testsContainer.innerHTML = '<p class="muted">Henüz hiç test eklenmemiş.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'card';

      const testTypeLabel = data.type === 'fill_blank' ? '✍️ Boşluk Doldurma' : '📝 Çoktan Seçmeli';

      let statsHtml = `<div class="stats-badge">Henüz kimse çözmedi.</div>`;
      if (data.lastResult) {
        statsHtml = `
          <div class="stats-badge">
            <strong>Son Çözen:</strong> ${data.lastResult.name} <br>
            <strong>Puan:</strong> ${data.lastResult.score}/${data.lastResult.total} (%${data.lastResult.percent})
          </div>`;
      }

      card.innerHTML = `
        <div class="card-header">
          <div>
            <h3 style="margin:0 0 4px 0">${data.title}</h3>
            <small class="muted">${testTypeLabel} • ${data.totalQuestions} Soru</small>
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn primary solve-btn">Çöz</button>
            <button class="btn danger delete-btn" style="padding:8px 12px; font-size:12px">Sil</button>
          </div>
        </div>
        ${statsHtml}
      `;

      card.querySelector('.solve-btn').onclick = () => startTest(doc.id, data.title, data.type);
      card.querySelector('.delete-btn').onclick = () => deleteTest(doc.id);
      
      testsContainer.appendChild(card);
    });
  }

  async function deleteTest(id) {
    if (!confirm("Bu testi ve içindeki tüm soruları silmek istediğine emin misin?")) return;
    try {
      const qs = await db.collection('questions').where('testId', '==', id).get();
      const batch = db.batch();
      qs.forEach(q => batch.delete(q.ref));
      batch.delete(db.collection('tests').doc(id));
      await batch.commit();
      alert("Test silindi.");
      loadTests();
    } catch (e) { alert("Silme hatası: " + e.message); }
  }

  // --- TEST ÇÖZME EKRANI ---
  async function startTest(id, title, type) {
    activeTestId = id;
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = '<p>Sorular yükleniyor...</p>';

    const qSnap = await db.collection('questions').where('testId', '==', id).get();
    currentQuestions = [];
    qSnap.forEach(d => currentQuestions.push({ id: d.id, ...d.data() }));

    const testTypeLabel = type === 'fill_blank' ? 'Boşluk Doldurma' : 'Çoktan Seçmeli';
    solveArea.innerHTML = `
      <h2 style="margin-top:0">${title}</h2>
      <p style="color:var(--muted); font-size:14px">${testTypeLabel} • ${currentQuestions.length} Soru</p>
    `;
    
    currentQuestions.forEach((q, i) => {
      const qCard = document.createElement('div');
      qCard.className = 'solve-card';
      
      if (q.type === 'multiple_choice') {
        qCard.innerHTML = `
          <p><strong>${i+1}.</strong> ${q.questionText}</p>
          <div class="options-group">
            ${q.options.map((opt, idx) => `
              <label class="option-btn">
                <input type="radio" name="q_${q.id}" value="${['A','B','C','D'][idx]}">
                <span>${['A','B','C','D'][idx]}) ${opt}</span>
              </label>
            `).join('')}
          </div>
        `;
        qCard.querySelectorAll('.option-btn').forEach(btn => {
          btn.onclick = () => {
            qCard.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          };
        });
      } else {
        qCard.innerHTML = `
          <p><strong>${i+1}.</strong> ${q.questionText}</p>
          <input type="text" class="blank-answer" name="q_${q.id}" placeholder="Cevabınızı yazın...">
        `;
      }
      
      solveArea.appendChild(qCard);
    });

    const finishBtn = document.createElement('button');
    finishBtn.className = 'btn success';
    finishBtn.style.width = '100%';
    finishBtn.style.marginTop = '20px';
    finishBtn.innerHTML = '<span class="btn-icon">✓</span> Testi Tamamla ve Sonucu Kaydet';
    finishBtn.onclick = finishTest;
    solveArea.appendChild(finishBtn);
  }

  async function finishTest() {
    const name = prompt("Lütfen adınızı soyadınızı girin:");
    if (!name || !name.trim()) return alert("İsim girmeden testi bitiremezsiniz.");

    let totalPoints = 0;
    let earnedPoints = 0;

    currentQuestions.forEach(q => {
      totalPoints += q.points;
      
      if (q.type === 'multiple_choice') {
        const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selected && selected.value === q.correctAnswer) {
          earnedPoints += q.points;
        }
      } else {
        const answer = document.querySelector(`input[name="q_${q.id}"]`);
        if (answer && answer.value.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          earnedPoints += q.points;
        }
      }
    });

    const percent = Math.round((earnedPoints / totalPoints) * 100);

    try {
      await db.collection('tests').doc(activeTestId).update({
        lastResult: {
          name: name.trim(),
          score: earnedPoints,
          total: totalPoints,
          percent: percent,
          date: new Date()
        }
      });

      solveArea.classList.add('hidden');
      resultArea.classList.remove('hidden');
      resultArea.innerHTML = `
        <div style="text-align:center; padding:20px">
          <h2 style="color:var(--success); margin-bottom:16px">🎉 Test Tamamlandı!</h2>
          <p style="font-size:16px; margin-bottom:24px">Sayın <strong>${name.trim()}</strong>,</p>
          <div style="font-size:32px; margin:20px 0; font-weight:bold; color:var(--accent)">
            ${earnedPoints} / ${totalPoints}
          </div>
          <p style="font-size:18px; color:var(--muted)">Başarı Oranı: <strong style="color:var(--accent)">%${percent}</strong></p>
          <button class="btn primary" onclick="location.reload()" style="margin-top:30px">
            <span class="btn-icon">🏠</span> Anasayfaya Dön
          </button>
        </div>
      `;
    } catch (e) {
      alert("Hata: Sonuç kaydedilemedi.\n" + e.message);
    }
  }

  // Uygulamayı Başlat
  loadTests();

})();
