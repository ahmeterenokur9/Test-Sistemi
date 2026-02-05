(function(){
  // ELEMENTLER
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const mTestTitle = document.getElementById('mTestTitle');
  const mAddQuestion = document.getElementById('mAddQuestion');
  const mSaveTest = document.getElementById('mSaveTest');
  const mReset = document.getElementById('mReset');
  const modalQuestions = document.getElementById('modalQuestions');
  
  const mBulkArea = document.getElementById('mBulkArea');
  const mImportExample = document.getElementById('mImportExample');
  const mPasteBulk = document.getElementById('mPasteBulk');
  const mPreviewBulk = document.getElementById('mPreviewBulk');
  const mClearBulk = document.getElementById('mClearBulk');

  const testsContainer = document.getElementById('testsContainer');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');
  const welcome = document.getElementById('welcome');

  let modalQuestionBlocks = [];
  let currentQuestions = [];

  // MODAL KONTROLLERİ
  function openModal() {
    modal.classList.remove('hidden');
    if(modalQuestionBlocks.length === 0) addModalQuestion();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  fab.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  
  window.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
  });

  // TOPLU EKLEME MANTIĞI
  mImportExample.addEventListener('click', () => {
    const sample = `[
  {
    "questionText": "Türkiye'nin başkenti neresidir?",
    "options": ["İstanbul", "Ankara", "İzmir", "Bursa"],
    "correctAnswer": "B",
    "points": 10
  },
  {
    "questionText": "2 + 2 kaç eder?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "B",
    "points": 10
  }
]`;
    mBulkArea.value = sample;
  });

  mClearBulk.addEventListener('click', () => mBulkArea.value = '');

  mPasteBulk.addEventListener('click', () => {
    const parsed = tryParseBulk(mBulkArea.value);
    if(!parsed) return alert('Veri okunamadı. Lütfen formatı kontrol edin.');
    
    parsed.forEach(item => {
      addModalQuestion(normalizeBulkItem(item));
    });
    alert(`${parsed.length} soru eklendi.`);
  });

  mPreviewBulk.addEventListener('click', () => {
    const parsed = tryParseBulk(mBulkArea.value);
    if(!parsed) return alert('Veri okunamadı.');
    
    modalQuestions.innerHTML = '';
    modalQuestionBlocks = [];
    parsed.forEach(item => addModalQuestion(normalizeBulkItem(item)));
  });

  function tryParseBulk(text) {
    if(!text.trim()) return null;
    try {
      // Önce standart JSON denemesi
      return JSON.parse(text);
    } catch(e) {
      try {
        // JSON başarısızsa JavaScript dizisi olarak değerlendir (new Function güvenli bir yöntemdir)
        const fn = new Function('return ' + text);
        const result = fn();
        return Array.isArray(result) ? result : null;
      } catch(err) {
        return null;
      }
    }
  }

  function normalizeBulkItem(item) {
    return {
      questionText: item.questionText || item.q || '',
      options: Array.isArray(item.options) ? item.options : (item.opts || ['', '', '', '']),
      correctAnswer: item.correctAnswer || item.answer || 'A',
      points: item.points || 10
    };
  }

  // SORU BLOĞU OLUŞTURMA
  function addModalQuestion(prefill = {}){
    const wrapper = document.createElement('div');
    wrapper.className = 'qblock';
    
    const idx = modalQuestionBlocks.length + 1;
    const qText = prefill.questionText || '';
    const options = prefill.options || ['', '', '', ''];
    const correct = prefill.correctAnswer || 'A';
    const points = prefill.points || 10;

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px">
        <strong>Soru ${idx}</strong>
        <button class="btn outline removeQ" style="color:red; border-color:red; padding:4px 8px">Sil</button>
      </div>
      <input class="q_text" type="text" placeholder="Soru metni" value="${qText}">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px">
        <input class="optA" placeholder="A Seçeneği" value="${options[0] || ''}">
        <input class="optB" placeholder="B Seçeneği" value="${options[1] || ''}">
        <input class="optC" placeholder="C Seçeneği" value="${options[2] || ''}">
        <input class="optD" placeholder="D Seçeneği" value="${options[3] || ''}">
      </div>
      <div style="display:flex; gap:15px; margin-top:10px; align-items:center">
        <span>Doğru Cevap:</span>
        <select class="correct" style="width:70px">
          <option value="A" ${correct==='A'?'selected':''}>A</option>
          <option value="B" ${correct==='B'?'selected':''}>B</option>
          <option value="C" ${correct==='C'?'selected':''}>C</option>
          <option value="D" ${correct==='D'?'selected':''}>D</option>
        </select>
        <span>Puan:</span>
        <input class="points" type="number" value="${points}" style="width:80px">
      </div>
    `;

    wrapper.querySelector('.removeQ').addEventListener('click', () => {
      wrapper.remove();
      modalQuestionBlocks = modalQuestionBlocks.filter(b => b !== wrapper);
      refreshIndices();
    });

    modalQuestions.appendChild(wrapper);
    modalQuestionBlocks.push(wrapper);
    wrapper.scrollIntoView({behavior:'smooth'});
  }

  function refreshIndices() {
    modalQuestionBlocks.forEach((b, i) => {
        b.querySelector('strong').textContent = `Soru ${i + 1}`;
    });
  }

  mAddQuestion.addEventListener('click', () => addModalQuestion());

  // TESTİ KAYDET
  mSaveTest.addEventListener('click', async () => {
    const title = mTestTitle.value.trim();
    if(!title) return alert('Test başlığı girin.');
    if(modalQuestionBlocks.length === 0) return alert('Soru eklemediniz.');

    mSaveTest.disabled = true;
    mSaveTest.textContent = 'Kaydediliyor...';

    try {
      const testRef = await db.collection('tests').add({
        title: title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: modalQuestionBlocks.length
      });

      const batch = db.batch();
      modalQuestionBlocks.forEach(block => {
        const qRef = db.collection('questions').doc();
        batch.set(qRef, {
          testId: testRef.id,
          questionText: block.querySelector('.q_text').value,
          options: [
            block.querySelector('.optA').value,
            block.querySelector('.optB').value,
            block.querySelector('.optC').value,
            block.querySelector('.optD').value
          ],
          correctAnswer: block.querySelector('.correct').value,
          points: parseInt(block.querySelector('.points').value) || 0
        });
      });
      await batch.commit();

      alert('Test kaydedildi!');
      location.reload();
    } catch (e) {
      alert('Hata: ' + e.message);
    } finally {
      mSaveTest.disabled = false;
      mSaveTest.textContent = 'Testi Kaydet';
    }
  });

  // TEST LİSTESİ VE SİLME ÖZELLİĞİ
  async function loadTests() {
    testsContainer.innerHTML = 'Yükleniyor...';
    const snapshot = await db.collection('tests').orderBy('createdAt', 'desc').get();
    testsContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <h3>${data.title}</h3>
          <small class="muted">${data.totalQuestions} Soru</small>
        </div>
        <div class="actions">
          <button class="btn primary solve-btn">Çöz</button>
          <button class="btn danger delete-btn">Sil</button>
        </div>
      `;
      
      card.querySelector('.solve-btn').onclick = () => startTest(doc.id, data.title);
      card.querySelector('.delete-btn').onclick = () => deleteTest(doc.id);
      
      testsContainer.appendChild(card);
    });
  }

  async function deleteTest(id) {
    if(!confirm('Bu testi ve tüm sorularını silmek istediğine emin misin?')) return;
    
    try {
      // 1. Soruları sil
      const qs = await db.collection('questions').where('testId', '==', id).get();
      const batch = db.batch();
      qs.forEach(q => batch.delete(q.ref));
      
      // 2. Testin kendisini sil
      batch.delete(db.collection('tests').doc(id));
      
      await batch.commit();
      alert('Test silindi.');
      loadTests();
    } catch (e) {
      alert('Silme hatası: ' + e.message);
    }
  }

  // TEST ÇÖZME VE DİĞER FONKSİYONLAR...
  async function startTest(id, title) {
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = 'Yükleniyor...';

    const qSnap = await db.collection('questions').where('testId', '==', id).get();
    currentQuestions = [];
    qSnap.forEach(d => currentQuestions.push({id: d.id, ...d.data()}));

    solveArea.innerHTML = `<h2>${title}</h2>`;
    currentQuestions.forEach((q, i) => {
      const qCard = document.createElement('div');
      qCard.className = 'solve-card';
      qCard.innerHTML = `
        <p><strong>${i+1}.</strong> ${q.questionText}</p>
        <div>
          ${q.options.map((opt, idx) => `
            <label class="option-btn">
              <input type="radio" name="q_${q.id}" value="${['A','B','C','D'][idx]}">
              ${['A','B','C','D'][idx]}) ${opt}
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
      solveArea.appendChild(qCard);
    });

    const finishBtn = document.createElement('button');
    finishBtn.className = 'btn primary mt';
    finishBtn.textContent = 'Testi Tamamla';
    finishBtn.onclick = finishTest;
    solveArea.appendChild(finishBtn);
  }

  function finishTest() {
    let score = 0;
    let total = 0;
    currentQuestions.forEach(q => {
      total += q.points;
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      if(selected && selected.value === q.correctAnswer) score += q.points;
    });

    solveArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
      <h2>Test Sonucu</h2>
      <p>Toplam Puan: <strong>${score} / ${total}</strong></p>
      <button class="btn outline mt" onclick="location.reload()">Anasayfaya Dön</button>
    `;
  }

  loadTests();
})();
