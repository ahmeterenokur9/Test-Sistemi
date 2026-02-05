// createTest.js
// Bu dosya create-test.html içinde <script> ile çağrılıyor.
// window.db değişkeni firebase.js tarafından sağlanıyor (compat firestore).

(function(){
  // DOM elementleri
  const testTitleInput = document.getElementById('testTitle');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const showExampleBtn = document.getElementById('showExampleBtn');
  const pasteFromJsBtn = document.getElementById('pasteFromJsBtn');
  const previewBulkBtn = document.getElementById('previewBulkBtn');
  const clearBulkBtn = document.getElementById('clearBulkBtn');
  const bulkTextarea = document.getElementById('bulkTextarea');
  const questionsContainer = document.getElementById('questionsContainer');
  const saveTestBtn = document.getElementById('saveTestBtn');
  const resetBtn = document.getElementById('resetBtn');

  let questionCount = 0;
  let questionBlocks = []; // DOM blocks

  // Helper: oluşturulan soru bloğunu DOM'a ekle (tercih: manuel veya toplu ekleme ile)
  function addQuestionToDOM(prefill = {}) {
    questionCount++;
    const index = questionCount;
    const block = document.createElement('div');
    block.className = 'questionBlock';
    block.dataset.qindex = index;

    const qText = prefill.questionText || '';
    const options = prefill.options || ['','','',''];
    const correct = prefill.correctAnswer || 'A';
    const points = (typeof prefill.points === 'number') ? prefill.points : 10;

    block.innerHTML = `
      <div class="questionHeader">
        <div>
          <div class="q-index">Soru ${index}</div>
          <div class="small">Puan: <input type="number" class="points" value="${points}" style="width:72px; display:inline-block; margin-left:6px"></div>
        </div>
        <div>
          <button class="removeBtn">Sil</button>
        </div>
      </div>

      <div class="kv">
        <label>Soru metni</label>
        <input type="text" class="questionText" value="${escapeHtml(qText)}" placeholder="Soru metni...">
      </div>

      <div class="options">
        <div class="optionRow"><input class="optionA" placeholder="Seçenek A" value="${escapeHtml(options[0]||'')}"></div>
        <div class="optionRow"><input class="optionB" placeholder="Seçenek B" value="${escapeHtml(options[1]||'')}"></div>
        <div class="optionRow"><input class="optionC" placeholder="Seçenek C" value="${escapeHtml(options[2]||'')}"></div>
        <div class="optionRow"><input class="optionD" placeholder="Seçenek D" value="${escapeHtml(options[3]||'')}"></div>
      </div>

      <div style="margin-top:8px">
        <label>Doğru cevap</label>
        <select class="correctAnswer">
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
    `;

    // set correct value
    block.querySelector('.correctAnswer').value = correct;

    // remove butonu
    block.querySelector('.removeBtn').addEventListener('click', () => {
      questionsContainer.removeChild(block);
      questionBlocks = questionBlocks.filter(b => b !== block);
      // Not: index'ler sabit kalır (basit)
    });

    questionBlocks.push(block);
    questionsContainer.appendChild(block);
    // Scroll to new block
    block.scrollIntoView({behavior:'smooth', block:'center'});
  }

  function escapeHtml(str){
    if(!str) return '';
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Yeni soru ekle (manuel)
  addQuestionBtn.addEventListener('click', () => {
    addQuestionToDOM();
  });

  // Show example - JS/JSON örneği textarea'ya koy
  showExampleBtn.addEventListener('click', () => {
    const example = `[
  {
    "questionText": "2 + 2 kaçtır?",
    "options": ["3","4","5","6"],
    "correctAnswer": "B",
    "points": 10
  },
  {
    "questionText": "Türkiye'nin başkenti hangi şehirdir?",
    "options": ["İzmir","Ankara","İstanbul","Bursa"],
    "correctAnswer": "B",
    "points": 10
  }
]`;
    bulkTextarea.value = example;
    bulkTextarea.focus();
  });

  // Clear bulk textarea
  clearBulkBtn.addEventListener('click', () => {
    bulkTextarea.value = '';
  });

  // Preview: parse bulk textarea and render in DOM (önizleme)
  previewBulkBtn.addEventListener('click', () => {
    const parsed = tryParseBulk(bulkTextarea.value);
    if(!parsed) {
      alert('JSON / JS array parse edilemedi. Lütfen örnek formatı kullan veya JSON array ver.');
      return;
    }
    // Temizle önceki önizlemeleri (isteğe bağlı: burada sadece ekliyoruz)
    parsed.forEach(item => addQuestionToDOM(normalizeBulkItem(item)));
  });

  // Paste from JS: doğrudan textarea içeriğini DOM'a ekle (aynı preview mantığı)
  pasteFromJsBtn.addEventListener('click', () => {
    const parsed = tryParseBulk(bulkTextarea.value);
    if(!parsed) {
      alert('Parse edilemedi. JSON array ya da JS array formatı gir.');
      return;
    }
    parsed.forEach(item => addQuestionToDOM(normalizeBulkItem(item)));
    // isteğe bağlı: temizle textarea
    // bulkTextarea.value = '';
  });

  // Normalize bulk item: eksik alanlara default ver
  function normalizeBulkItem(item){
    const q = {};
    q.questionText = (item.questionText || item.q || item.question || '').toString();
    q.options = Array.isArray(item.options) ? item.options.slice(0,4) : (item.opts || []).slice(0,4);
    // Ensure 4 options
    while(q.options.length < 4) q.options.push('');
    q.correctAnswer = (item.correctAnswer || item.answer || 'A').toString();
    // Eğer doğru cevap indeks verilmişse (0-3) -> A-D
    if(/^[0-3]$/.test(String(q.correctAnswer))) {
      const map = ['A','B','C','D'];
      q.correctAnswer = map[Number(q.correctAnswer)];
    }
    q.points = Number.isFinite(Number(item.points)) ? Number(item.points) : 10;
    return q;
  }

  // Try parse bulk input: JSON.parse, fallback rudimentary JS array parsing
  function tryParseBulk(text){
    if(!text) return null;
    // 1) temizleyip JSON.parse dene
    try {
      const parsed = JSON.parse(text);
      if(Array.isArray(parsed)) return parsed;
    } catch(e){}
    // 2) Eğer "const questions = [...]" veya "let arr = [...]" formatıysa köşeli parantez kısmını al
    const arrMatch = text.match(/\[([\s\S]*)\]/m);
    if(arrMatch){
      const arrText = '[' + arrMatch[1] + ']';
      // JSON.parse may fail because of single quotes or trailing commas — attempt to sanitize:
      let sanitized = arrText.replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":') // bare keys -> quoted
                         .replace(/'/g, '"') // single -> double
                         .replace(/,\s*]/g, ']') // trailing commas
                         .replace(/,\s*}/g, '}');
      try {
        const parsed2 = JSON.parse(sanitized);
        if(Array.isArray(parsed2)) return parsed2;
      } catch(e){
        // final fallback: try eval (riskli). We'll do a safe eval-like attempt:
        try {
          // Allow only array literal: ensure no letters before first bracket except var/let/const
          // Use Function constructor to parse expression
          const fn = new Function('return ' + arrText);
          const val = fn();
          if(Array.isArray(val)) return val;
        } catch(err){
          console.warn('eval parse failed', err);
        }
      }
    }
    return null;
  }

  // Save test to Firestore
  saveTestBtn.addEventListener('click', async () => {
    const title = testTitleInput.value.trim();
    if(!title) { alert('Lütfen test başlığı gir.'); return; }
    // collect questions from DOM
    const blocks = Array.from(document.querySelectorAll('.questionBlock'));
    if(blocks.length === 0) { alert('En az 1 soru eklemelisin.'); return; }

    // Construct question objects
    const questions = blocks.map(b => {
      const questionText = b.querySelector('.questionText').value.trim();
      const options = [
        b.querySelector('.optionA').value.trim(),
        b.querySelector('.optionB').value.trim(),
        b.querySelector('.optionC').value.trim(),
        b.querySelector('.optionD').value.trim(),
      ];
      const correct = b.querySelector('.correctAnswer').value;
      const points = parseFloat(b.querySelector('.points').value) || 0;
      return { questionText, options, correctAnswer: correct, points };
    });

    // Validate
    for(let i=0;i<questions.length;i++){
      const q = questions[i];
      if(!q.questionText) { alert(`Soru ${i+1} metni boş olamaz.`); return; }
      if(q.options.every(opt => opt === '')) { alert(`Soru ${i+1} için en az bir seçenek gir.`); return; }
    }

    // Disable button
    saveTestBtn.disabled = true;
    saveTestBtn.textContent = 'Kaydediliyor...';

    try {
      // Add test
      const testRef = await db.collection('tests').add({
        title,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Add questions (seri olarak)
      for(const q of questions){
        await db.collection('questions').add({
          testId: testRef.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points
        });
      }

      alert('Test başarıyla kaydedildi! Firestore -> tests & questions koleksiyonlarını kontrol et.');
      // reset UI
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Kaydetme sırasında hata oluştu. Konsolu kontrol et.');
    } finally {
      saveTestBtn.disabled = false;
      saveTestBtn.textContent = 'Testi Firestore\'a Kaydet';
    }
  });

  // Reset form
  resetBtn.addEventListener('click', () => {
    if(confirm('Formu sıfırlamak istiyor musunuz?')) resetForm();
  });

  function resetForm(){
    testTitleInput.value = '';
    bulkTextarea.value = '';
    questionsContainer.innerHTML = '';
    questionBlocks = [];
    questionCount = 0;
  }

  // Başlangıç: 1 soru ekle
  addQuestionToDOM();

})();
