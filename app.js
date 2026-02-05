(function(){
  // --- ELEMENTLER ---
  const db = window.db; // firebase.js'den gelen veritabanı bağlantısı
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
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

  let modalQuestionBlocks = []; // Modal içindeki soru kutuları
  let currentQuestions = [];    // Çözülen testin soruları
  let activeTestId = null;      // O an çözülen testin ID'si

  // --- MODAL YÖNETİMİ ---
  function openModal() {
    modal.classList.remove('hidden');
    // Eğer hiç soru yoksa otomatik bir tane boş soru ekle
    if (modalQuestionBlocks.length === 0) addModalQuestion();
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  fab.onclick = openModal;
  modalClose.onclick = closeModal;

  // Modal dışına tıklanırsa kapat
  window.onclick = (e) => { if (e.target === modal) closeModal(); };

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
    
    const qText = prefill.questionText || '';
    const options = prefill.options || ['', '', '', ''];
    const correct = prefill.correctAnswer || 'A';
    const points = prefill.points || 10;

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <strong>Soru ${modalQuestionBlocks.length + 1}</strong>
        <button class="btn outline remove-q" style="color:red; border-color:red; padding:2px 8px">Sil</button>
      </div>
      <input class="q_text" type="text" placeholder="Soru metnini yazın..." value="${qText}">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top:8px">
        <input class="optA" placeholder="A Şıkkı" value="${options[0] || ''}">
        <input class="optB" placeholder="B Şıkkı" value="${options[1] || ''}">
        <input class="optC" placeholder="C Şıkkı" value="${options[2] || ''}">
        <input class="optD" placeholder="D Şıkkı" value="${options[3] || ''}">
      </div>
      <div style="margin-top:10px; font-size:13px; display:flex; gap:15px; align-items:center">
        <span>Doğru: 
          <select class="correct_ans">
            <option value="A" ${correct==='A'?'selected':''}>A</option>
            <option value="B" ${correct==='B'?'selected':''}>B</option>
            <option value="C" ${correct==='C'?'selected':''}>C</option>
            <option value="D" ${correct==='D'?'selected':''}>D</option>
          </select>
        </span>
        <span>Puan: <input type="number" class="q_points" value="${points}" style="width:50px; padding:2px"></span>
      </div>
    `;

    wrapper.querySelector('.remove-q').onclick = () => {
      wrapper.remove();
      modalQuestionBlocks = modalQuestionBlocks.filter(b => b !== wrapper);
      updateQuestionNumbers();
    };

    modalQuestions.appendChild(wrapper);
    modalQuestionBlocks.push(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth' });
  }

  function updateQuestionNumbers() {
    modalQuestionBlocks.forEach((b, i) => {
      b.querySelector('strong').textContent = `Soru ${i + 1}`;
    });
  }

  mAddQuestion.onclick = () => addModalQuestion();

  // --- TOPLU EKLEME (BULK IMPORT) ---
  mImportExample.onclick = () => {
    mBulkArea.value = `[
  {
    "questionText": "Gökyüzü ne renktir?",
    "options": ["Mavi", "Yeşil", "Kırmızı", "Sarı"],
    "correctAnswer": "A",
    "points": 10
  }
]`;
  };

  mPasteBulk.onclick = () => {
    const val = mBulkArea.value.trim();
    if (!val) return alert("Lütfen önce kutuya veri yapıştırın.");
    
    try {
      // Hem JSON'u hem de standart JS dizilerini desteklemek için esnek çözüm
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
      alert("Format Hatası: Veriyi JSON veya JS Dizisi olarak kontrol edin.");
    }
  };

  // --- TESTİ KAYDET (FIREBASE BATCH) ---
  mSaveTest.onclick = async () => {
    const title = mTestTitle.value.trim();
    if (!title) return alert("Lütfen teste bir başlık verin.");
    if (modalQuestionBlocks.length === 0) return alert("En az bir soru eklemelisiniz.");

    mSaveTest.disabled = true;
    mSaveTest.textContent = "Kaydediliyor...";

    try {
      const batch = db.batch();
      const testRef = db.collection('tests').doc();
      
      batch.set(testRef, {
        title: title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: modalQuestionBlocks.length,
        lastResult: null // Henüz kimse çözmedi
      });

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
          correctAnswer: block.querySelector('.correct_ans').value,
          points: parseInt(block.querySelector('.q_points').value) || 0
        });
      });

      await batch.commit();
      alert("Test başarıyla yayınlandı!");
      location.reload();
    } catch (err) {
      alert("Hata oluştu: " + err.message);
      mSaveTest.disabled = false;
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

      // İstatistik Kutusu
      let statsHtml = `<div class="stats-badge">Henüz kimse çözmedi.</div>`;
      if (data.lastResult) {
        statsHtml = `
          <div class="stats-badge">
            <strong>Son Çözen:</strong> ${data.lastResult.name} <br>
            <strong>Puan:</strong> ${data.lastResult.score}/${data.lastResult.total} (%${data.lastResult.percent})
          </div>`;
      }

      card.innerHTML = `
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <h3 style="margin:0">${data.title}</h3>
            <small class="muted">${data.totalQuestions} Soru</small>
          </div>
          <div style="display:flex; gap:5px">
            <button class="btn primary solve-btn">Çöz</button>
            <button class="btn danger delete-btn" style="padding:5px 10px">Sil</button>
          </div>
        </div>
        ${statsHtml}
      `;

      card.querySelector('.solve-btn').onclick = () => startTest(doc.id, data.title);
      card.querySelector('.delete-btn').onclick = () => deleteTest(doc.id);
      
      testsContainer.appendChild(card);
    });
  }

  async function deleteTest(id) {
    if (!confirm("Bu testi ve içindeki tüm soruları silmek istediğine emin misin?")) return;
    try {
      // Önce soruları bul ve sil
      const qs = await db.collection('questions').where('testId', '==', id).get();
      const batch = db.batch();
      qs.forEach(q => batch.delete(q.ref));
      // Sonra testi sil
      batch.delete(db.collection('tests').doc(id));
      await batch.commit();
      alert("Test silindi.");
      loadTests();
    } catch (e) { alert("Silme hatası: " + e.message); }
  }

  // --- TEST ÇÖZME EKRANI ---
  async function startTest(id, title) {
    activeTestId = id;
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = '<p>Sorular yükleniyor...</p>';

    const qSnap = await db.collection('questions').where('testId', '==', id).get();
    currentQuestions = [];
    qSnap.forEach(d => currentQuestions.push({ id: d.id, ...d.data() }));

    solveArea.innerHTML = `<h2 style="margin-top:0">${title}</h2>`;
    
    currentQuestions.forEach((q, i) => {
      const qCard = document.createElement('div');
      qCard.className = 'solve-card';
      qCard.innerHTML = `
        <p><strong>${i+1}.</strong> ${q.questionText}</p>
        <div class="options-group">
          ${q.options.map((opt, idx) => `
            <label class="option-btn">
              <input type="radio" name="q_${q.id}" value="${['A','B','C','D'][idx]}">
              ${['A','B','C','D'][idx]}) ${opt}
            </label>
          `).join('')}
        </div>
      `;
      // Şıkka tıklandığında seçili hale getir
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
    finishBtn.style.width = '100%';
    finishBtn.textContent = 'Testi Tamamla ve Sonucu Kaydet';
    finishBtn.onclick = finishTest;
    solveArea.appendChild(finishBtn);
  }

  async function finishTest() {
    const name = prompt("Lütfen adınızı soyadınızı girin:");
    if (!name) return alert("İsim girmeden testi bitiremezsiniz.");

    let totalPoints = 0;
    let earnedPoints = 0;

    currentQuestions.forEach(q => {
      totalPoints += q.points;
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      if (selected && selected.value === q.correctAnswer) {
        earnedPoints += q.points;
      }
    });

    const percent = Math.round((earnedPoints / totalPoints) * 100);

    // İstatistiği Firestore'da Güncelle
    try {
      await db.collection('tests').doc(activeTestId).update({
        lastResult: {
          name: name,
          score: earnedPoints,
          total: totalPoints,
          percent: percent,
          date: new Date()
        }
      });

      solveArea.classList.add('hidden');
      resultArea.classList.remove('hidden');
      resultArea.innerHTML = `
        <div style="text-align:center">
          <h2 style="color:var(--accent)">Test Tamamlandı!</h2>
          <p>Sayın <strong>${name}</strong>,</p>
          <div style="font-size:24px; margin:20px 0">Puanınız: <strong>${earnedPoints} / ${totalPoints}</strong></div>
          <p>Başarı Oranı: %${percent}</p>
          <button class="btn outline mt" onclick="location.reload()">Anasayfaya Dön</button>
        </div>
      `;
    } catch (e) {
      alert("Hata: Sonuç kaydedilemedi.");
    }
  }

  // Uygulamayı Başlat
  loadTests();

})();
