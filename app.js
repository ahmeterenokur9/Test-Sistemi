// js/app.js
// Bağımlılık: js/firebase.js (compat firestore) yüklü olmalı

(function(){
  // ELEMENTS
  const fab = document.getElementById('fabAdd');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const mTestTitle = document.getElementById('mTestTitle');
  const mAddQuestion = document.getElementById('mAddQuestion');
  const mImportExample = document.getElementById('mImportExample');
  const mPasteBulk = document.getElementById('mPasteBulk');
  const mBulkArea = document.getElementById('mBulkArea');
  const mPreviewBulk = document.getElementById('mPreviewBulk');
  const mClearBulk = document.getElementById('mClearBulk');
  const modalQuestions = document.getElementById('modalQuestions');
  const mSaveTest = document.getElementById('mSaveTest');
  const mReset = document.getElementById('mReset');

  const testsContainer = document.getElementById('testsContainer');
  const solveArea = document.getElementById('solveArea');
  const resultArea = document.getElementById('resultArea');
  const welcome = document.getElementById('welcome');

  // Limits
  const MAX_QUESTIONS = 10;

  // Local state
  let modalQuestionBlocks = [];
  let currentTest = null;
  let currentQuestions = []; // loaded when solving

  // ---------- Modal logic ----------
  fab.addEventListener('click', () => openModal());
  modalClose.addEventListener('click', closeModal);
  mReset.addEventListener('click', () => {
    if(confirm('Formu ve soruları temizlemek istiyor musunuz?')) resetModal();
  });

  function openModal(){
    modal.classList.remove('hidden');
    if(modalQuestionBlocks.length === 0) addModalQuestion();
    // scroll to top
    modal.querySelector('.modal-card').scrollTop = 0;
  }
  function closeModal(){ modal.classList.add('hidden'); }

  function resetModal(){
    mTestTitle.value = '';
    mBulkArea.value = '';
    modalQuestions.innerHTML = '';
    modalQuestionBlocks = [];
    addModalQuestion();
  }

  function addModalQuestion(prefill = {}){
    if(modalQuestionBlocks.length >= MAX_QUESTIONS){
      alert('En fazla 10 soru ekleyebilirsin.');
      return;
    }
    const idx = modalQuestionBlocks.length + 1;
    const wrapper = document.createElement('div');
    wrapper.className = 'qblock';

    const qText = prefill.questionText || '';
    const options = prefill.options || ['','','',''];
    const correct = prefill.correctAnswer || 'A';
    const points = typeof prefill.points === 'number' ? prefill.points : 10;

    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Soru ${idx}</strong>
        <button class="btn outline removeQuestion">Sil</button>
      </div>
      <label class="mt">Soru metni</label>
      <input class="q_text" type="text" value="${escapeHtml(qText)}" placeholder="Soru metni..." />
      <div style="display:grid;grid-template-columns:1fr 1fr; gap:8px; margin-top:8px">
        <input class="optA" placeholder="Seçenek A" value="${escapeHtml(options[0]||'')}" />
        <input class="optB" placeholder="Seçenek B" value="${escapeHtml(options[1]||'')}" />
        <input class="optC" placeholder="Seçenek C" value="${escapeHtml(options[2]||'')}" />
        <input class="optD" placeholder="Seçenek D" value="${escapeHtml(options[3]||'')}" />
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <label>Puan</label>
        <input class="points" type="number" value="${points}" style="width:90px" />
        <label>Doğru cevap</label>
        <select class="correct">
          <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
        </select>
      </div>
    `;
    wrapper.querySelector('.correct').value = correct;

    // remove
    wrapper.querySelector('.removeQuestion').addEventListener('click', () => {
      modalQuestions.removeChild(wrapper);
      modalQuestionBlocks = modalQuestionBlocks.filter(b => b !== wrapper);
      refreshModalIndices();
    });

    modalQuestionBlocks.push(wrapper);
    modalQuestions.appendChild(wrapper);
    wrapper.scrollIntoView({behavior:'smooth'});
  }

  function refreshModalIndices(){
    modalQuestionBlocks.forEach((b,i) => {
      b.querySelector('strong').textContent = `Soru ${i+1}`;
    });
  }

  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // bulk example
  mImportExample.addEventListener('click', () => {
    const sample = `[
  {"questionText":"2 + 2 kaçtır?", "options":["3","4","5","6"], "correctAnswer":"B", "points":10},
  {"questionText":"Türkiye'nin başkenti neresidir?", "options":["İzmir","Ankara","İstanbul","Bursa"], "correctAnswer":"B", "points":10}
]`;
    mBulkArea.value = sample;
  });

  mClearBulk.addEventListener('click', () => mBulkArea.value = '');

  mPreviewBulk.addEventListener('click', () => {
    const parsed = tryParseBulk(mBulkArea.value);
    if(!parsed) { alert('JSON/JS array parse edilemedi. Örnek formatı kullan.'); return; }
    // sadece preview: temizle önceki modalQuestions sonra ekle
    modalQuestions.innerHTML = '';
    modalQuestionBlocks = [];
    parsed.slice(0, MAX_QUESTIONS).forEach(it => addModalQuestion(normalizeBulkItem(it)));
  });

  mPasteBulk.addEventListener('click', () => {
    const parsed = tryParseBulk(mBulkArea.value);
    if(!parsed) { alert('Parse edilemedi.'); return; }
    parsed.slice(0, MAX_QUESTIONS).forEach(it => addModalQuestion(normalizeBulkItem(it)));
  });

  // normalize bulk
  function normalizeBulkItem(item){
    const q = {};
    q.questionText = item.questionText || item.q || item.question || '';
    q.options = Array.isArray(item.options) ? item.options.slice(0,4) : (item.opts || []);
    while(q.options.length < 4) q.options.push('');
    q.correctAnswer = item.correctAnswer || item.answer || 'A';
    if(/^[0-3]$/.test(String(q.correctAnswer))) q.correctAnswer = ['A','B','C','D'][Number(q.correctAnswer)];
    q.points = Number.isFinite(Number(item.points)) ? Number(item.points) : 10;
    return q;
  }

  function tryParseBulk(text){
    if(!text) return null;
    try {
      const parsed = JSON.parse(text);
      if(Array.isArray(parsed)) return parsed;
    } catch(e){}
    const arrMatch = text.match(/\[([\s\S]*)\]/m);
    if(arrMatch){
      const arrText = '[' + arrMatch[1] + ']';
      let sanitized = arrText.replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":')
                             .replace(/'/g, '"')
                             .replace(/,\s*]/g, ']')
                             .replace(/,\s*}/g, '}');
      try {
        const parsed2 = JSON.parse(sanitized);
        if(Array.isArray(parsed2)) return parsed2;
      } catch(e){}
      try {
        const fn = new Function('return ' + arrText);
        const val = fn();
        if(Array.isArray(val)) return val;
      } catch(err){}
    }
    return null;
  }

  mAddQuestion.addEventListener('click', () => addModalQuestion());

  // Save test -> write to Firestore (tests + questions)
  mSaveTest.addEventListener('click', async () => {
    const title = mTestTitle.value.trim();
    if(!title){ alert('Test başlığı gerekli'); return; }
    if(modalQuestionBlocks.length === 0){ alert('En az 1 soru ekle'); return; }
    // validate
    const questions = modalQuestionBlocks.map(b => {
      return {
        questionText: b.querySelector('.q_text').value.trim(),
        options: [
          b.querySelector('.optA').value.trim(),
          b.querySelector('.optB').value.trim(),
          b.querySelector('.optC').value.trim(),
          b.querySelector('.optD').value.trim()
        ],
        correctAnswer: b.querySelector('.correct').value,
        points: parseFloat(b.querySelector('.points').value) || 0
      };
    });

    for(let i=0;i<questions.length;i++){
      if(!questions[i].questionText) { alert(`Soru ${i+1} metni boş olamaz`); return; }
    }

    mSaveTest.disabled = true;
    mSaveTest.textContent = 'Kaydediliyor...';

    try {
      // add test
      const testRef = await db.collection('tests').add({
        title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalQuestions: questions.length
      });

      // add questions
      const batch = db.batch ? db.batch() : null;
      if(batch){
        questions.forEach((q,i) => {
          const qRef = db.collection('questions').doc();
          batch.set(qRef, { testId: testRef.id, ...q });
        });
        await batch.commit();
      } else {
        for(const q of questions){
          await db.collection('questions').add({ testId: testRef.id, ...q });
        }
      }

      alert('Test kaydedildi.');
      closeModal();
      resetModal();
      loadTests(); // yenile test listesini
    } catch(err){
      console.error('Kaydetme hatası', err);
      alert('Kaydetme sırasında hata oluştu. Konsolu kontrol et.');
    } finally {
      mSaveTest.disabled = false;
      mSaveTest.textContent = 'Testi Kaydet';
    }
  });

  // ---------- List tests ----------
  async function loadTests(){
    testsContainer.innerHTML = '<div class="small muted">Yükleniyor...</div>';
    try {
      const snapshot = await db.collection('tests').orderBy('createdAt','desc').get();
      testsContainer.innerHTML = '';
      if(snapshot.empty){ testsContainer.innerHTML = '<div class="small muted">Henüz test yok</div>'; return; }
      snapshot.forEach(doc => {
        const t = doc.data();
        const card = document.createElement('div');
        card.className = 'card';
        const meta = document.createElement('div');
        meta.className = 'meta';
        const title = document.createElement('h3');
        title.textContent = t.title || 'Başlıksız Test';
        const small = document.createElement('div');
        small.className = 'small';
        small.textContent = `Sorular: ${t.totalQuestions || '—'}`;
        meta.appendChild(title); meta.appendChild(small);

        const actions = document.createElement('div');
        actions.className = 'actions';
        const solveBtn = document.createElement('button');
        solveBtn.className = 'btn';
        solveBtn.textContent = 'Çöz';
        solveBtn.addEventListener('click', () => openTest(doc.id, t.title));
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn outline';
        previewBtn.textContent = 'İncele';
        previewBtn.addEventListener('click', () => previewTest(doc.id));
        actions.appendChild(solveBtn);
        actions.appendChild(previewBtn);

        card.appendChild(meta);
        card.appendChild(actions);
        testsContainer.appendChild(card);
      });
    } catch(err){
      console.error('Yükleme hatası', err);
      testsContainer.innerHTML = '<div class="small muted">Yüklenemedi (konsolu kontrol et)</div>';
    }
  }

  // ---------- Open test to solve ----------
  async function openTest(testId, title){
    welcome.classList.add('hidden');
    resultArea.classList.add('hidden');
    solveArea.classList.remove('hidden');
    solveArea.innerHTML = '<div class="small muted">Soru yükleniyor...</div>';
    currentTest = { id: testId, title };

    try {
      const qsSnap = await db.collection('questions').where('testId','==',testId).get();
      const questions = [];
      qsSnap.forEach(d => {
        const data = d.data();
        data.id = d.id;
        questions.push(data);
      });
      // sort by doc id order not guaranteed; just keep as is
      currentQuestions = questions;
      renderSolveView();
    } catch(err){
      console.error('Soru yükleme hatası', err);
      solveArea.innerHTML = '<div class="small muted">Sorular yüklenemedi.</div>';
    }
  }

  function previewTest(testId){
    // basit: aynı openTest ama sonuçları göstermeyecek (yalnızca soruları listeler)
    openTest(testId, 'Önizleme');
  }

  // ---------- Render solve view ----------
  function renderSolveView(){
    if(!currentQuestions || currentQuestions.length === 0){
      solveArea.innerHTML = '<div class="small muted">Bu testte soru yok.</div>';
      return;
    }

    // build UI
    const title = document.createElement('h2');
    title.textContent = currentTest.title || 'Test';
    const container = document.createElement('div');
    container.className = 'solve-container';

    // Timer (optional) - for simplicity set default = none. We include a stopwatch using start time
    const timerBox = document.createElement('div');
    timerBox.className = 'small muted';
    timerBox.textContent = 'Süre: 00:00';
    let startTime = Date.now();
    let timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      timerBox.textContent = 'Süre: ' + formatSec(sec);
    }, 1000);

    // questions
    const qlist = document.createElement('div');
    currentQuestions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'solve-card';
      card.dataset.qid = q.id;

      const qTitle = document.createElement('div');
      qTitle.className = 'q-title';
      qTitle.textContent = `${idx+1}. ${q.questionText}`;

      const opts = document.createElement('div');
      opts.className = 'options-list';

      const letters = ['A','B','C','D'];
      letters.forEach((letter, li) => {
        const optionBtn = document.createElement('label');
        optionBtn.className = 'option-btn';
        optionBtn.innerHTML = `<input type="radio" name="q_${q.id}" value="${letter}"><span>${letter}) ${q.options[li] || ''}</span>`;
        optionBtn.addEventListener('click', () => {
          // unselect all then select this
          const all = card.querySelectorAll('.option-btn');
          all.forEach(a => a.classList.remove('selected'));
          optionBtn.classList.add('selected');
          optionBtn.querySelector('input').checked = true;
        });
        opts.appendChild(optionBtn);
      });

      card.appendChild(qTitle);
      card.appendChild(opts);
      container.appendChild(card);
    });

    // actions (submit)
    const actions = document.createElement('div');
    actions.className = 'solve-actions';
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Gönder ve Puanla';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn outline';
    cancelBtn.textContent = 'Vazgeç';
    cancelBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      solveArea.classList.add('hidden');
      welcome.classList.remove('hidden');
    });

    submitBtn.addEventListener('click', async () => {
      // collect answers
      const cards = Array.from(container.querySelectorAll('.solve-card'));
      const answers = cards.map(c => {
        const qid = c.dataset.qid;
        const checked = c.querySelector('input[type="radio"]:checked');
        return { questionId: qid, selected: checked ? checked.value : null };
      });

      // scoring
      let totalPoints = 0;
      let earned = 0;
      const detailed = [];

      // match question data
      for(const q of currentQuestions){
        totalPoints += Number(q.points || 0);
        const ans = answers.find(a => a.questionId === q.id);
        const selected = ans ? ans.selected : null;
        const correct = q.correctAnswer || 'A';
        const point = Number(q.points || 0);
        const isCorrect = selected === correct;
        if(isCorrect) earned += point;
        detailed.push({ questionId: q.id, selected, correct, point, isCorrect });
      }

      const finalScore = totalPoints > 0 ? Math.round((earned / totalPoints) * 10000) / 100 : 0;
      const durationSec = Math.floor((Date.now() - startTime) / 1000);

      // save submission
      try {
        const subRef = await db.collection('submissions').add({
          testId: currentTest.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          rawScore: earned,
          totalPoints,
          finalScore,
          durationSec,
          details: detailed
        });
        // show result UI
        clearInterval(timerInterval);
        renderResult({ subId: subRef.id, earned, totalPoints, finalScore, durationSec, detailed });
      } catch(err){
        console.error('Submission save error', err);
        alert('Sonuç kaydedilemedi. Konsolu kontrol et.');
      }
    });

    actions.appendChild(submitBtn);
    actions.appendChild(cancelBtn);

    // render
    solveArea.innerHTML = '';
    solveArea.appendChild(title);
    solveArea.appendChild(timerBox);
    solveArea.appendChild(container);
    solveArea.appendChild(actions);
  }

  function formatSec(s){
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }

  // ---------- Render result ----------
  function renderResult(data){
    solveArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
      <h3>Sonuçlar</h3>
      <div class="result-box">
        <p><strong>Puan:</strong> ${data.earned} / ${data.totalPoints} → <strong>${data.finalScore}%</strong></p>
        <p><strong>Süre:</strong> ${formatSec(data.durationSec)}</p>
        <p class="small muted">Detaylar aşağıda listelenmiştir.</p>
        <div style="margin-top:10px">
          ${data.detailed.map((d,i) => `<div style="padding:6px;border-radius:6px;border:1px solid #eef2f7;margin-bottom:6px">
            <div><strong>Soru ${i+1}</strong></div>
            <div class="small">Seçilen: ${d.selected || '—'}  •  Doğru: ${d.correct}  •  Puan: ${d.isCorrect ? d.point : 0}/${d.point}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:12px">
        <button id="backToList" class="btn">Test Listesine Dön</button>
      </div>
    `;
    document.getElementById('backToList').addEventListener('click', () => {
      resultArea.classList.add('hidden');
      welcome.classList.remove('hidden');
      loadTests();
    });
  }

  // ---------- Init ----------
  loadTests();
  // initial modal question
  // addModalQuestion(); // modal is empty until opened

})();
