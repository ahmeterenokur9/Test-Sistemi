(function(){
  // --- ELEMENTLER ---
  const db = window.db;
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  
  // Adımlar
  const stepTypeSelection = document.getElementById('stepTypeSelection');
  const stepTestInfo = document.getElementById('stepTestInfo');
  
  // Form elemanları
  const mTestTitle = document.getElementById('mTestTitle');
  const mAddQuestion = document.getElementById('mAddQuestion');
  const mSaveTest = document.getElementById('mSaveTest');
  const mReset = document.getElementById('mReset');
  const mBackToType = document.getElementById('mBackToType');
  const modalQuestions = document.getElementById('modalQuestions');
  const mBulkArea = document.getElementById('mBulkArea');
  const mPasteBulk = document.getElementById('mPasteBulk');
  const mImportExample = document.getElementById('mImportExample');

  // Ana alanlar
  const testsContainer = document.getElementById('testsContainer');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');
  const welcome = document.getElementById('welcome');

  let modalQuestionBlocks = [];
  let currentQuestions = [];
  let activeTestId = null;
  let selectedTestType = null; // 'quiz' veya 'fillblank'

  // --- MODAL YÖNETİMİ ---
  function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
    resetModal();
  }

  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  function resetModal() {
    selectedTestType = null;
    stepTypeSelection.classList.remove('hidden');
    stepTestInfo.classList.add('hidden');
    modalQuestions.innerHTML = '';
    modalQuestionBlocks = [];
    mTestTitle.value = '';
    mBulkArea.value = '';
    
    // Seçili tipi temizle
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.remove('selected');
    });
  }

  fab.onclick = openModal;
  modalClose.onclick = closeModal;
  
  window.onclick = (e) => { 
    if (e.target === modal) closeModal(); 
  };

  // --- TİP SEÇİMİ ---
  document.querySelectorAll('.type-option').forEach(option => {
    option.onclick = () => {
      selectedTestType = option.dataset.type;
      document.querySelectorAll('.type-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      option.classList.add('selected');
      
      // 500ms sonra bir sonraki adıma geç
      setTimeout(() => {
        stepTypeSelection.classList.add('hidden');
        stepTestInfo.classList.remove('hidden');
        
        if (selectedTestType === 'quiz') {
          modalTitle.textContent = '📝 Yeni Test Oluştur (Çoktan Seçmeli)';
        } else {
          modalTitle.textContent = '✏️ Yeni Test Oluştur (Boşluk Doldurma)';
        }
        
        // Otomatik bir soru ekle
        addModalQuestion();
      }, 500);
    };
  });

  mBackToType.onclick = () => {
    stepTestInfo.classList.add('hidden');
    stepTypeSelection.classList.remove('hidden');
    modalQuestions.innerHTML = '';
    modalQuestionBlocks = [];
  };

  // --- SORU EKLEME ---
  function addModalQuestion(prefill = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'qblock animate-in';
    
    if (selectedTestType === 'quiz') {
      // Çoktan Seçmeli Soru
      const qText = prefill.questionText || '';
      const options = prefill.options || ['', '', '', ''];
      const correct = prefill.correctAnswer || 'A';
      const points = prefill.points || 10;

      wrapper.innerHTML = `
        <div class="qblock-header">
          <strong>❓ Soru ${modalQuestionBlocks.length + 1}</strong>
          <button class="btn btn-danger remove-q" style="padding: 6px 12px; font-size: 0.75rem">🗑️ Sil</button>
        </div>
        <input class="q_text" type="text" placeholder="Soru metnini yazın..." value="${qText}">
        <div class="options-grid">
          <input class="optA" placeholder="A) Birinci şık" value="${options[0] || ''}">
          <input class="optB" placeholder="B) İkinci şık" value="${options[1] || ''}">
          <input class="optC" placeholder="C) Üçüncü şık" value="${options[2] || ''}">
          <input class="optD" placeholder="D) Dördüncü şık" value="${options[3] || ''}">
        </div>
        <div class="qblock-footer">
          <span>Doğru Cevap: 
            <select class="correct_ans">
              <option value="A" ${correct==='A'?'selected':''}>A</option>
              <option value="B" ${correct==='B'?'selected':''}>B</option>
              <option value="C" ${correct==='C'?'selected':''}>C</option>
              <option value="D" ${correct==='D'?'selected':''}>D</option>
            </select>
          </span>
          <span>Puan: <input type="number" class="q_points" value="${points}" style="width:60px"></span>
        </div>
      `;
    } else {
      // Boşluk Doldurma Sorusu
      const qText = prefill.questionText || '';
      const answer = prefill.correctAnswer || '';
      const pool = prefill.answerPool || [];
      const points = prefill.points || 10;

      wrapper.innerHTML = `
        <div class="qblock-header">
          <strong>✏️ Soru ${modalQuestionBlocks.length + 1}</strong>
          <button class="btn btn-danger remove-q" style="padding: 6px 12px; font-size: 0.75rem">🗑️ Sil</button>
        </div>
        <label style="font-size: 0.875rem; margin-bottom: 8px; color: var(--text-muted)">
          Soru Metni (boşluk için <span class="blank-input">____</span> kullanın)
        </label>
        <input class="q_text" type="text" placeholder="Örn: Türkiye'nin başkenti ____ şehridir." value="${qText}">
        
        <label style="font-size: 0.875rem; margin-top: 12px; margin-bottom: 8px; color: var(--text-muted)">
          Doğru Cevap
        </label>
        <input class="correct_ans" type="text" placeholder="Örn: Ankara" value="${answer}">
        
        <div class="answer-pool">
          <div class="answer-pool-title">🎯 Cevap Havuzu (virgülle ayırın)</div>
          <input class="answer_pool" type="text" placeholder="Örn: İstanbul, Ankara, İzmir, Bursa" value="${pool.join(', ')}">
          <small style="color: var(--text-muted); display: block; margin-top: 8px;">
            Kullanıcı bu kelimelerden birisini seçerek boşluğu dolduracak
          </small>
        </div>
        
        <div class="qblock-footer">
          <span>Puan: <input type="number" class="q_points" value="${points}" style="width:60px"></span>
        </div>
      `;
    }

    wrapper.querySelector('.remove-q').onclick = () => {
      wrapper.remove();
      modalQuestionBlocks = modalQuestionBlocks.filter(b => b !== wrapper);
      updateQuestionNumbers();
    };

    modalQuestions.appendChild(wrapper);
    modalQuestionBlocks.push(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateQuestionNumbers() {
    modalQuestionBlocks.forEach((b, i) => {
      const icon = selectedTestType === 'quiz' ? '❓' : '✏️';
      b.querySelector('strong').textContent = `${icon} Soru ${i + 1}`;
    });
  }

  mAddQuestion.onclick = () => addModalQuestion();

  // --- TOPLU EKLEME ---
  mImportExample.onclick = () => {
    if (selectedTestType === 'quiz') {
      mBulkArea.value = `[
  {
    "questionText": "Türkiye'nin başkenti neresidir?",
    "options": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "correctAnswer": "B",
    "points": 10
  },
  {
    "questionText": "Dünyanın en büyük okyanusu hangisidir?",
    "options": ["Atlas", "Hint", "Pasifik", "Kuzey Buz"],
    "correctAnswer": "C",
    "points": 10
  }
]`;
    } else {
      mBulkArea.value = `[
  {
    "questionText": "Türkiye'nin başkenti ____ şehridir.",
    "correctAnswer": "Ankara",
    "answerPool": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "points": 10
  },
  {
    "questionText": "Su ____ derecede kaynar.",
    "correctAnswer": "100",
    "answerPool": ["0", "50", "100", "200"],
    "points": 10
  }
]`;
    }
  };

  mPasteBulk.onclick = () => {
    const val = mBulkArea.value.trim();
    if (!val) return alert("⚠️ Lütfen önce kutuya veri yapıştırın.");
    
    try {
      const data = JSON.parse(val);
      
      if (Array.isArray(data)) {
        data.forEach(item => {
          addModalQuestion(item);
        });
        alert(`✅ ${data.length} soru başarıyla eklendi!`);
        mBulkArea.value = '';
      } else {
        alert("❌ Hata: Girdiğiniz veri bir liste (array) olmalıdır.");
      }
    } catch (e) {
      alert("❌ Format Hatası: Veriyi JSON formatında kontrol edin.\n\n" + e.message);
    }
  };

  mReset.onclick = () => {
    if(confirm('🔄 Tüm formu sıfırlamak istediğinize emin misiniz?')) {
      modalQuestions.innerHTML = '';
      modalQuestionBlocks = [];
      mTestTitle.value = '';
      mBulkArea.value = '';
      addModalQuestion();
    }
  };

  // --- TESTİ KAYDET ---
  mSaveTest.onclick = async () => {
    const title = mTestTitle.value.trim();
    if (!title) return alert("⚠️ Lütfen teste bir başlık verin.");
    if (modalQuestionBlocks.length === 0) return alert("⚠️ En az bir soru eklemelisiniz.");

    mSaveTest.disabled = true;
    mSaveTest.textContent = "Kaydediliyor...";

    try {
      const batch = db.batch();
      const testRef = db.collection('tests').doc();
      
      batch.set(testRef, {
        title: title,
        testType: selectedTestType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: modalQuestionBlocks.length,
        lastResult: null
      });

      modalQuestionBlocks.forEach(block => {
        const qRef = db.collection('questions').doc();
        const baseData = {
          testId: testRef.id,
          questionText: block.querySelector('.q_text').value,
          points: parseInt(block.querySelector('.q_points').value) || 0
        };

        if (selectedTestType === 'quiz') {
          batch.set(qRef, {
            ...baseData,
            options: [
              block.querySelector('.optA').value,
              block.querySelector('.optB').value,
              block.querySelector('.optC').value,
              block.querySelector('.optD').value
            ],
            correctAnswer: block.querySelector('.correct_ans').value
          });
        } else {
          const poolInput = block.querySelector('.answer_pool').value;
          const pool = poolInput.split(',').map(s => s.trim()).filter(s => s);
          
          batch.set(qRef, {
            ...baseData,
            correctAnswer: block.querySelector('.correct_ans').value.trim(),
            answerPool: pool
          });
        }
      });

      await batch.commit();
      alert("✅ Test başarıyla yayınlandı!");
      closeModal();
      loadTests();
    } catch (err) {
      alert("❌ Hata oluştu: " + err.message);
      mSaveTest.disabled = false;
      mSaveTest.textContent = "✅ Testi Yayınla";
    }
  };

  // --- TEST LİSTESİ ---
  async function loadTests() {
    testsContainer.innerHTML = '<p class="muted loading">Yükleniyor...</p>';
    const snapshot = await db.collection('tests').orderBy('createdAt', 'desc').get();
    testsContainer.innerHTML = '';

    if (snapshot.empty) {
      testsContainer.innerHTML = '<p class="muted">Henüz hiç test eklenmemiş. Sağ alttaki + butonuna tıklayarak ilk testinizi oluşturun.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'test-card animate-in';

      const typeClass = data.testType === 'quiz' ? 'type-quiz' : 'type-fillblank';
      const typeText = data.testType === 'quiz' ? '📝 Test' : '✏️ Boşluk Doldurma';

      let statsHtml = `<div class="stats-badge">Henüz kimse çözmedi</div>`;
      if (data.lastResult) {
        statsHtml = `
          <div class="stats-badge">
            <strong>Son Çözen:</strong> ${data.lastResult.name}<br>
            <strong>Puan:</strong> ${data.lastResult.score}/${data.lastResult.total} 
            <strong>(%${data.lastResult.percent})</strong>
          </div>`;
      }

      card.innerHTML = `
        <div class="test-card-header">
          <div class="test-info">
            <h3>${data.title}</h3>
            <span class="test-type-badge ${typeClass}">${typeText}</span>
          </div>
        </div>
        <div class="test-meta">
          <span>📊 ${data.totalQuestions} Soru</span>
        </div>
        ${statsHtml}
        <div class="test-actions">
          <button class="btn btn-primary solve-btn" style="flex: 1">🎯 Çöz</button>
          <button class="btn btn-danger delete-btn">🗑️</button>
        </div>
      `;

      card.querySelector('.solve-btn').onclick = () => startTest(doc.id, data.title, data.testType);
      card.querySelector('.delete-btn').onclick = () => deleteTest(doc.id);
      
      testsContainer.appendChild(card);
    });
  }

  async function deleteTest(id) {
    if (!confirm("🗑️ Bu testi ve içindeki tüm soruları silmek istediğinize emin misiniz?")) return;
    try {
      const qs = await db.collection('questions').where('testId', '==', id).get();
      const batch = db.batch();
      qs.forEach(q => batch.delete(q.ref));
      batch.delete(db.collection('tests').doc(id));
      await batch.commit();
      alert("✅ Test silindi.");
      loadTests();
    } catch (e) { 
      alert("❌ Silme hatası: " + e.message); 
    }
  }

  // --- TEST ÇÖZME ---
  async function startTest(id, title, testType) {
    activeTestId = id;
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = '<p class="loading">Sorular yükleniyor...</p>';

    const qSnap = await db.collection('questions').where('testId', '==', id).get();
    currentQuestions = [];
    qSnap.forEach(d => currentQuestions.push({ id: d.id, ...d.data() }));

    const typeIcon = testType === 'quiz' ? '📝' : '✏️';
    solveArea.innerHTML = `<h2 style="margin-top:0">${typeIcon} ${title}</h2>`;
    
    currentQuestions.forEach((q, i) => {
      const qCard = document.createElement('div');
      qCard.className = 'solve-card animate-in';
      
      if (testType === 'quiz') {
        // Çoktan Seçmeli
        qCard.innerHTML = `
          <p class="question-text"><strong>${i+1}.</strong> ${q.questionText}</p>
          <div class="options-group">
            ${q.options.map((opt, idx) => `
              <label class="option-btn">
                <input type="radio" name="q_${q.id}" value="${['A','B','C','D'][idx]}">
                <span><strong>${['A','B','C','D'][idx]})</strong> ${opt}</span>
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
        // Boşluk Doldurma
        const parts = q.questionText.split('____');
        let questionHtml = '<p class="question-text fillblank-question"><strong>' + (i+1) + '.</strong> ';
        
        parts.forEach((part, idx) => {
          questionHtml += part;
          if (idx < parts.length - 1) {
            questionHtml += `<input type="text" class="fillblank-input answer-input" data-qid="${q.id}" 
                             list="pool_${q.id}" placeholder="...">`;
          }
        });
        questionHtml += '</p>';
        
        // Cevap havuzu
        const poolHtml = `
          <div class="answer-pool">
            <div class="answer-pool-title">🎯 Cevap Havuzu</div>
            <div class="pool-tags">
              ${q.answerPool.map(ans => `<span class="pool-tag">${ans}</span>`).join('')}
            </div>
          </div>
          <datalist id="pool_${q.id}">
            ${q.answerPool.map(ans => `<option value="${ans}">`).join('')}
          </datalist>
        `;
        
        qCard.innerHTML = questionHtml + poolHtml;
      }
      
      solveArea.appendChild(qCard);
    });

    const finishBtn = document.createElement('button');
    finishBtn.className = 'btn btn-success mt';
    finishBtn.style.width = '100%';
    finishBtn.textContent = '✅ Testi Tamamla ve Sonucu Kaydet';
    finishBtn.onclick = () => finishTest(testType);
    solveArea.appendChild(finishBtn);
  }

  async function finishTest(testType) {
    const name = prompt("📝 Lütfen adınızı soyadınızı girin:");
    if (!name || !name.trim()) return alert("⚠️ İsim girmeden testi bitiremezsiniz.");

    let totalPoints = 0;
    let earnedPoints = 0;

    currentQuestions.forEach(q => {
      totalPoints += q.points;
      
      if (testType === 'quiz') {
        const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selected && selected.value === q.correctAnswer) {
          earnedPoints += q.points;
        }
      } else {
        const input = document.querySelector(`.answer-input[data-qid="${q.id}"]`);
        if (input && input.value.trim().toLowerCase() === q.correctAnswer.toLowerCase()) {
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
      
      let emoji = '🎉';
      if (percent >= 90) emoji = '🏆';
      else if (percent >= 70) emoji = '🎉';
      else if (percent >= 50) emoji = '👍';
      else emoji = '💪';
      
      resultArea.innerHTML = `
        <div class="result-card animate-in">
          <div class="result-icon">${emoji}</div>
          <h2>Test Tamamlandı!</h2>
          <p>Sayın <strong>${name.trim()}</strong>,</p>
          <div class="result-score">${earnedPoints} / ${totalPoints}</div>
          <p class="result-percent">Başarı Oranı: %${percent}</p>
          <button class="btn btn-primary" onclick="location.reload()">🏠 Anasayfaya Dön</button>
        </div>
      `;
      
      // Test listesini güncelle
      loadTests();
    } catch (e) {
      alert("❌ Hata: Sonuç kaydedilemedi. " + e.message);
    }
  }

  // Uygulamayı Başlat
  loadTests();

})();
