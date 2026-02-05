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

  // Olay Dinleyicileri (Kapatma butonunun çalışması için kritik yer)
  fab.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  
  // Modal dışına tıklandığında kapatma (Bonus özellik)
  window.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
  });

  mReset.addEventListener('click', () => {
    if(confirm('Tüm formu temizlemek istediğine emin misin?')) {
        modalQuestions.innerHTML = '';
        modalQuestionBlocks = [];
        mTestTitle.value = '';
        addModalQuestion();
    }
  });

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
        <input class="optA" placeholder="A Seçeneği" value="${options[0]}">
        <input class="optB" placeholder="B Seçeneği" value="${options[1]}">
        <input class="optC" placeholder="C Seçeneği" value="${options[2]}">
        <input class="optD" placeholder="D Seçeneği" value="${options[3]}">
      </div>
      <div style="display:flex; gap:15px; margin-top:10px; align-items:center">
        <span>Doğru:</span>
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
    });

    modalQuestions.appendChild(wrapper);
    modalQuestionBlocks.push(wrapper);
    wrapper.scrollIntoView({behavior:'smooth'});
  }

  mAddQuestion.addEventListener('click', () => addModalQuestion());

  // KAYDETME İŞLEMİ
  mSaveTest.addEventListener('click', async () => {
    const title = mTestTitle.value.trim();
    if(!title) return alert('Lütfen test başlığı girin.');
    if(modalQuestionBlocks.length === 0) return alert('En az bir soru eklemelisiniz.');

    mSaveTest.disabled = true;
    mSaveTest.textContent = 'Kaydediliyor...';

    try {
      const testRef = await db.collection('tests').add({
        title: title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: modalQuestionBlocks.length
      });

      for(let block of modalQuestionBlocks) {
        const qData = {
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
        };
        await db.collection('questions').add(qData);
      }

      alert('Test başarıyla kaydedildi!');
      closeModal();
      location.reload(); // Sayfayı yenileyerek listeyi güncelle
    } catch (error) {
      console.error(error);
      alert('Hata oluştu, konsolu kontrol edin.');
    } finally {
      mSaveTest.disabled = false;
      mSaveTest.textContent = 'Kaydet ve Yayınla';
    }
  });

  // TESTLERİ LİSTELEME
  async function loadTests() {
    testsContainer.innerHTML = 'Yükleniyor...';
    const snapshot = await db.collection('tests').orderBy('createdAt', 'desc').get();
    testsContainer.innerHTML = '';
    
    if(snapshot.empty) {
        testsContainer.innerHTML = '<p class="muted">Henüz test eklenmemiş.</p>';
        return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <h3>${data.title}</h3>
          <small class="muted">${data.totalQuestions} Soru</small>
        </div>
        <button class="btn primary solve-btn" data-id="${doc.id}" data-title="${data.title}">Çöz</button>
      `;
      card.querySelector('.solve-btn').addEventListener('click', () => startTest(doc.id, data.title));
      testsContainer.appendChild(card);
    });
  }

  // TEST ÇÖZME EKRANI
  async function startTest(id, title) {
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = 'Sorular getiriliyor...';

    const qSnap = await db.collection('questions').where('testId', '==', id).get();
    currentQuestions = [];
    qSnap.forEach(d => currentQuestions.push({id: d.id, ...d.data()}));

    solveArea.innerHTML = `<h2>${title}</h2>`;
    currentQuestions.forEach((q, i) => {
      const qCard = document.createElement('div');
      qCard.className = 'solve-card';
      qCard.innerHTML = `
        <p><strong>Soru ${i+1}:</strong> ${q.questionText}</p>
        <div class="options-container" data-qid="${q.id}">
          ${q.options.map((opt, idx) => `
            <label class="option-btn">
              <input type="radio" name="q_${q.id}" value="${['A','B','C','D'][idx]}">
              ${['A','B','C','D'][idx]}) ${opt}
            </label>
          `).join('')}
        </div>
      `;
      solveArea.appendChild(qCard);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary mt';
    submitBtn.textContent = 'Testi Bitir ve Puanla';
    submitBtn.onclick = finishTest;
    solveArea.appendChild(submitBtn);
  }

  function finishTest() {
    let score = 0;
    let totalPossible = 0;

    currentQuestions.forEach(q => {
      totalPossible += q.points;
      const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
      if(selected && selected.value === q.correctAnswer) {
        score += q.points;
      }
    });

    solveArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
      <h2>Sonuç: ${score} / ${totalPossible} Puan</h2>
      <p>Başarı Oranı: %${Math.round((score/totalPossible)*100)}</p>
      <button class="btn outline mt" onclick="location.reload()">Listeye Dön</button>
    `;
  }

  // Başlat
  loadTests();

})();
