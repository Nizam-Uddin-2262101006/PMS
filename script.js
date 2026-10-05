// Basic UI behaviors for PMIS form
document.addEventListener('DOMContentLoaded', function(){
  // Sidebar toggle for small screens
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if(sidebarToggle){
    sidebarToggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
  }

  // Section collapse toggles
  document.querySelectorAll('.section-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const secId = btn.getAttribute('data-toggle-section');
      const sec = document.getElementById(secId);
      if(!sec) return;
      sec.classList.toggle('collapsed');
    });
  });

  // Simple toast helper
  const toast = document.getElementById('toastEnt');
  const toastMsg = document.getElementById('toastMsg');
  const form = document.getElementById('pmisForm');

  function showToast(msg, type='success', timeout=2500){
    toastMsg.textContent = msg;
    toast.classList.remove('success','error');
    toast.classList.add(type);
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), timeout);
  }

  function gatherGridRecords(gridName){
    const container = document.getElementById('grid-' + gridName);
    if(!container) return [];
    return Array.from(container.querySelectorAll('.case-card')).map(card => card.rowValues || {});
  }

  function gatherCaseRecords(){
    const container = document.getElementById('caseContainer');
    if(!container) return [];
    return Array.from(container.querySelectorAll('.case-card')).map(card => card.rowValues || {});
  }

  function collectFormPayload(form){
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key] === undefined) {
        data[key] = value;
      } else if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    });

    data.detaineeClass = form.elements.detaineeClass?.value || form.elements.prisonerCategory?.value || '';
    data.prisonerCategory = data.detaineeClass;

    data.currentAddress = {
      division: form.elements.curDivision?.value || '',
      district: form.elements.curDistrict?.value || '',
      upazila: form.elements.curUpazila?.value || '',
      ward: form.elements.curWard?.value || '',
      road: form.elements.curRoad?.value || ''
    };

    data.permanentAddress = {
      division: form.elements.permDivision?.value || '',
      district: form.elements.permDistrict?.value || '',
      upazila: form.elements.permUpazila?.value || '',
      ward: form.elements.permWard?.value || '',
      road: form.elements.permRoad?.value || ''
    };

    data.foreignAddress = {
      country: form.elements.fCountry?.value || '',
      state: form.elements.fState?.value || '',
      city: form.elements.fCity?.value || '',
      postal: form.elements.fPostal?.value || '',
      road: form.elements.fRoad?.value || ''
    };

    data.familyMembers = gatherGridRecords('family');
    data.educationHistory = gatherGridRecords('education');
    data.medicalRecords = gatherGridRecords('medical');
    data.callLogs = gatherGridRecords('calls');
    data.visitorLogs = gatherGridRecords('visitors');
    data.transfers = gatherGridRecords('transfers');
    data.remands = gatherGridRecords('remands');
    data.caseRecords = gatherCaseRecords();

    data.refNo = getOrCreateRefNo();
    return data;
  }

  function getOrCreateRefNo(){
    const refEl = document.getElementById('prisonerRefNo');
    let currentRef = refEl?.textContent?.replace('Ref: ', '').trim() || '';
    if (!currentRef || currentRef === 'PR-2026-000000') {
      currentRef = `PR-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
      if (refEl) refEl.textContent = `Ref: ${currentRef}`;
    }
    return currentRef;
  }

  function getMandatoryFieldsStatus(){
    if(!form) return { missing: [], all: [] };
    
    const mandatoryFields = form.querySelectorAll('[data-validate="required"], [required]');
    const missing = [];
    const all = [];
    
    mandatoryFields.forEach(field => {
      if (field.disabled || field.hidden || field.closest('[hidden]')) return;

      const label = field.closest('.f-group')?.querySelector('.f-label')?.textContent?.replace('*', '').trim() || field.name;
      all.push(label);
      
      if (field.type === 'select-one' || field.tagName === 'SELECT') {
        if (!field.value) {
          missing.push(label);
          field.closest('.f-group')?.classList.add('field-error');
        } else {
          field.closest('.f-group')?.classList.remove('field-error');
        }
      } else if (field.tagName === 'TEXTAREA') {
        if (!field.value.trim()) {
          missing.push(label);
          field.closest('.f-group')?.classList.add('field-error');
        } else {
          field.closest('.f-group')?.classList.remove('field-error');
        }
      } else if (field.type === 'date') {
        if (!field.value) {
          missing.push(label);
          field.closest('.f-group')?.classList.add('field-error');
        } else {
          field.closest('.f-group')?.classList.remove('field-error');
        }
      } else if (field.type === 'tel') {
        if (!field.value || field.value.length < 11) {
          missing.push(label);
          field.closest('.f-group')?.classList.add('field-error');
        } else {
          field.closest('.f-group')?.classList.remove('field-error');
        }
      } else {
        if (!field.value.trim()) {
          missing.push(label);
          field.closest('.f-group')?.classList.add('field-error');
        } else {
          field.closest('.f-group')?.classList.remove('field-error');
        }
      }
    });
    
    return { missing, all };
  }

  async function saveFormToServer(event){
    if(event && typeof event.preventDefault === 'function'){
      event.preventDefault();
    }
    if(!form) return;
    
    const { missing, all } = getMandatoryFieldsStatus();
    
    if(missing.length > 0){
      const missingList = missing.map((f, i) => `${i + 1}. ${f}`).join('\n');
      const message = `নিম্নোক্ত আবশ্যক ক্ষেত্র পূরণ করুন:\n\n${missingList}`;
      
      // Scroll to first error field
      const firstErrorField = form.querySelector('[data-validate="required"].f-control, [required].f-control');
      if(firstErrorField && firstErrorField.closest('.f-group')?.classList.contains('field-error')){
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => firstErrorField.focus(), 600);
      }
      
      alert(message);
      showToast(`${missing.length}টি আবশ্যক ক্ষেত্র খালি আছে`, 'error', 3000);
      return;
    }

    const payload = collectFormPayload(form);
    try{
      const response = await fetch('/api/prisoners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if(!response.ok){
        throw new Error(result.error || 'সার্ভার ত্রুটি');
      }
      showToast('ডাটাবেসে সফলভাবে সংরক্ষণ হয়েছে', 'success');
      if(result.id){
        const refEl = document.getElementById('prisonerRefNo');
        if(refEl) refEl.textContent = `Ref: ${payload.refNo}`;
      }
    } catch(error){
      showToast('সংরক্ষণ করতে ব্যর্থ: ' + error.message, 'error', 4000);
    }
  }

  // Save draft and save buttons
  const btnSaveDraft = document.getElementById('btnSaveDraft');
  const btnSave = document.getElementById('btnSave');
  if(btnSaveDraft) btnSaveDraft.addEventListener('click', ()=> showToast('খসড়া সংরক্ষিত হয়েছে', 'success'));
  if(btnSave) btnSave.addEventListener('click', saveFormToServer);
  if(form){
    form.addEventListener('submit', saveFormToServer);
  }

  // Reset form
  const btnReset = document.getElementById('btnReset');
  const sameAsPresentAddress = document.getElementById('sameAsPresentAddress');
  const presentAddressFields = ['curDivision','curDistrict','curUpazila','curWard','curRoad'];
  const permanentAddressFields = ['permDivision','permDistrict','permUpazila','permWard','permRoad'];

  // Add event listeners to clear error highlighting on user input
  if(form){
    const formFields = form.querySelectorAll('[data-validate="required"], [required]');
    formFields.forEach(field => {
      field.addEventListener('input', () => {
        field.closest('.f-group')?.classList.remove('field-error');
      });
      field.addEventListener('change', () => {
        field.closest('.f-group')?.classList.remove('field-error');
      });
    });
  }

  function syncPermanentAddressFromPresent(){
    if(!form || !sameAsPresentAddress) return;

    const permanentInputs = permanentAddressFields
      .map(name => form.elements[name])
      .filter(Boolean);

    permanentInputs.forEach(input => {
      input.disabled = sameAsPresentAddress.checked;
    });

    if(!sameAsPresentAddress.checked) return;

    presentAddressFields.forEach((name, index) => {
      const source = form.elements[name];
      const target = form.elements[permanentAddressFields[index]];
      if(source && target){
        target.value = source.value;
      }
    });
  }

  if(btnReset && form){
    btnReset.addEventListener('click', ()=>{
      if(confirm('আপনি কি ফর্ম রিসেট করতে চান?')){
        form.reset();
        if(sameAsPresentAddress){
          sameAsPresentAddress.checked = false;
        }
        syncPermanentAddressFromPresent();
        showToast('ফর্ম রিসেট করা হয়েছে','success');
      }
    });
  }

  if(sameAsPresentAddress && form){
    sameAsPresentAddress.addEventListener('change', syncPermanentAddressFromPresent);
    presentAddressFields.forEach(name => {
      const input = form.elements[name];
      if(input){
        input.addEventListener('input', syncPermanentAddressFromPresent);
      }
    });
    syncPermanentAddressFromPresent();
  }

  const biometricModal = document.getElementById('biometricModal');
  const biometricModalTitle = document.getElementById('biometricModalTitle');
  const biometricModalBody = document.getElementById('biometricModalBody');
  const biometricStartBtn = document.getElementById('biometricStartBtn');

  const biometricTemplates = {
    photo: {
      icon: 'fa-camera',
      title: 'ছবি ক্যাপচার কনফিগারেশন',
      subtitle: 'পাসপোর্ট সাইজ ছবি, রেজোলিউশন ও পর্যালোচনা',
      badge: 'ছবি',
      description: 'এই পেজে ছবির ধরন, প্রিপারেশন, ডিভাইস সিলেকশন এবং ক্যাপচার পরবর্তী স্টেপ কনফিগার করা যাবে।',
      steps: ['ক্যামেরা মোড নির্বাচন করুন', 'সঠিক আলো ও পজিশন নিশ্চিত করুন', 'ছবি সংগ্রহ শেষে প্রিভিউ দেখুন']
    },
    signature: {
      icon: 'fa-signature',
      title: 'ডিজিটাল স্বাক্ষর কনফিগারেশন',
      subtitle: 'স্বাক্ষর ব্লকে ধরন এবং ডিভাইস সেটিংস',
      badge: 'স্বাক্ষর',
      description: 'স্বাক্ষর ক্যাপচারের জন্য টাচপেন বা মাউস ইনপুট কনফিগারেশন পেতে পারে।',
      steps: ['ইনপুট মেথড বেছে নিন', 'স্বাক্ষর এলাকাটি পরিষ্কার রাখুন', 'সেভ করার আগে প্রিভিউ দেখুন']
    },
    'iris-l': {
      icon: 'fa-eye',
      title: 'বাম চোখের আইরিশ স্ক্যান কনফিগারেশন',
      subtitle: 'বাম চোখের আইরিশের জন্য স্ক্যান সেটিংস',
      badge: 'আইরিশ (বাম)',
      description: 'আইরিশ স্ক্যানের জন্য আলো, দূরত্ব এবং রিকগনিশন সেটিংস কনফিগার করুন।',
      steps: ['স্ক্যানার ডিভাইস কনফিগার করুন', 'চোখের অবস্থান সঠিক রাখুন', 'স্ক্যান সফল হলে ফলাফল সংরক্ষণ করুন']
    },
    'iris-r': {
      icon: 'fa-eye',
      title: 'ডান চোখের আইরিশ স্ক্যান কনফিগারেশন',
      subtitle: 'ডান চোখের আইরিশের জন্য স্ক্যান সেটিংস',
      badge: 'আইরিশ (ডান)',
      description: 'ডান চোখের আইরিশ স্ক্যানিং কাজটি একই পদ্ধতিতে সম্পন্ন হবে।',
      steps: ['স্ক্যানার ডিভাইস কনফিগার করুন', 'চোখের অবস্থান সঠিক রাখুন', 'স্ক্যান সফল হলে ফলাফল সংরক্ষণ করুন']
    },
    fingerprint: {
      icon: 'fa-fingerprint',
      title: 'ফিঙ্গারপ্রিন্ট ক্যাপচার কনফিগারেশন',
      subtitle: 'ফিঙ্গারপ্রিন্ট স্ক্যানার, অঙ্গুলি নির্বাচন ও প্রস্তুতি',
      badge: 'ফিঙ্গারপ্রিন্ট',
      description: 'এই পপআপে ফিঙ্গারপ্রিন্ট ক্যাপচারের ডিভাইস, অঙ্গুলির ধরন এবং প্রাথমিক সেটআপ কনফিগার করা হবে।',
      steps: ['স্ক্যানার ডিভাইস সংযুক্ত কিনা যাচাই করুন', 'অঙ্গুলির অবস্থান সুস্পষ্ট রাখুন', 'স্ক্যান শেষে ফলাফল প্রিভিউ করুন']
    }
  };

  function openBiometricModal(type){
    const tpl = biometricTemplates[type] || biometricTemplates.fingerprint;
    biometricModalTitle.innerHTML = `<i class="fa-solid ${tpl.icon} me-2"></i>${tpl.title}`;
    biometricModalBody.innerHTML = `
      <div class="capture-grid">
        <div class="capture-card">
          <div class="capture-badge"><i class="fa-solid ${tpl.icon}"></i> ${tpl.badge}</div>
          <h6 class="mt-3">${tpl.subtitle}</h6>
          <p>${tpl.description}</p>
          <div class="capture-alert">
            <i class="fa-solid fa-circle-info"></i>
            <span>এই পপআপটি এখনো কাস্টম ক্যাপচার ইন্টারফেস হিসেবে সাজানো হয়েছে। ভবিষ্যতে এখানে লাইভ ক্যামেরা / স্ক্যানার একশন যুক্ত করা যায়।</span>
          </div>
          <div class="capture-pill-list">
            ${tpl.steps.map(step => `<span>${step}</span>`).join('')}
          </div>
        </div>
        <div class="capture-card">
          <h6>ক্যাপচার সেটিংস</h6>
          <p>ডিভাইস, মোড এবং প্রাক-সেটআপের জন্য নিচের অপশন ব্যবহার করুন।</p>
          <div class="f-group mb-3">
            <label class="f-label">ডিভাইস নির্বাচন</label>
            <select class="f-control">
              <option>USB স্ক্যানার</option>
              <option>লিভ ক্যামেরা</option>
              <option>মোবাইল ডিভাইস</option>
            </select>
          </div>
          <div class="f-group mb-3">
            <label class="f-label">ক্যাপচার মোড</label>
            <select class="f-control">
              <option>স্ট্যান্ডার্ড</option>
              <option>হাই-রেজলিউশন</option>
              <option>ফাস্ট মোড</option>
            </select>
          </div>
          <div class="capture-preview">
            <div>
              <i class="fa-solid ${tpl.icon}"></i>
              <div class="mt-2">প্রিভিউ এলাকার জন্য প্রস্তুত</div>
            </div>
          </div>
        </div>
      </div>
    `;
    const modal = new bootstrap.Modal(biometricModal);
    modal.show();
  }

  document.querySelectorAll('[data-bio-action]').forEach(btn=>{
    btn.addEventListener('click', ()=> openBiometricModal(btn.getAttribute('data-bio-action')));
  });

  // Initialize fingerprint grid placeholders (10 slots)
  const fpGrid = document.getElementById('fingerprintGrid');
  if(fpGrid){
    for(let i=1;i<=10;i++){
      const slot = document.createElement('div');
      slot.className = 'bio-slot';
      slot.innerHTML = `<div class="bio-preview"><i class="fa-solid fa-fingerprint"></i></div><p>আঙুল ${i}</p><button type="button" class="btn-ent" data-fp="${i}">স্ক্যান</button>`;
      const scanBtn = slot.querySelector('button');
      if(scanBtn){ scanBtn.addEventListener('click', ()=> openBiometricModal('fingerprint')); }
      fpGrid.appendChild(slot);
    }
  }

  if(biometricStartBtn){
    biometricStartBtn.addEventListener('click', ()=>{
      const modalInstance = bootstrap.Modal.getInstance(biometricModal);
      if(modalInstance) modalInstance.hide();
      showToast('বায়োমেট্রিক ক্যাপচার কনফিগারেশন প্রস্তুত হয়েছে','success');
    });
  }

// Grid configuration for dynamic data cards
  const gridConfigurations = {
    family: {
      label: 'পারিবারিক সদস্য',
      fields: [
        {key:'nameBn', label:'নাম (বাংলায়)', type:'text'},
        {key:'nameEn', label:'নাম (ইংরেজিতে)', type:'text'},
        {key:'relation', label:'সম্পর্ক', type:'select', options:['পিতা','মাতা','ভাই','বোন','স্ত্রী','স্বামী','ছেলে','মেয়ে','আত্মীয়','আইনজীবী','অভিভাবক','জরুরি যোগাযোগ','অন্যান্য']},
        {key:'mobile', label:'মোবাইল নম্বর', type:'tel'}
      ]
    },
    education: {
      label: 'শিক্ষাগত যোগ্যতা',
      fields: [
        {key:'examName', label:'পরীক্ষার নাম', type:'text'},
        {key:'institute', label:'প্রতিষ্ঠানের নাম', type:'text'},
        {key:'result', label:'ফলাফল', type:'text'},
        {key:'year', label:'পাশের সন', type:'number'}
      ]
    },
    medical: {
      label: 'মেডিকেল তথ্য',
      fields: [
        {key:'condition', label:'শারীরিক অবস্থা', type:'text'},
        {key:'disease', label:'রোগ/চিকিৎসা', type:'text'},
        {key:'hospital', label:'হাসপাতাল', type:'text'},
        {key:'visitTime', label:'যাওয়ার তারিখ ও সময়', type:'datetime-local'},
        {key:'returnTime', label:'ফেরতের তারিখ ও সময়', type:'datetime-local'},
        {key:'doctor', label:'ডাক্তারের নাম', type:'text'},
        {key:'prescription', label:'প্রেসক্রিপশন', type:'text'}
      ]
    },
    calls: {
      label: 'কল রেকর্ড',
      fields: [
        {key:'callDate', label:'কলের তারিখ', type:'date'},
        {key:'personName', label:'ব্যক্তির নাম', type:'text'},
        {key:'relation', label:'সম্পর্ক', type:'text'},
        {key:'mobile', label:'মোবাইল নম্বর', type:'tel'},
        {key:'balance', label:'ব্যালেন্স', type:'number'},
        {key:'startTime', label:'শুরু সময়', type:'time'},
        {key:'endTime', label:'শেষ সময়', type:'time'}
      ]
    },
    visitors: {
      label: 'সাক্ষাত রেকর্ড',
      fields: [
        {key:'visitDate', label:'সাক্ষাতের তারিখ', type:'date'},
        {key:'visitorName', label:'ব্যক্তির নাম', type:'text'},
        {key:'relation', label:'সম্পর্ক', type:'text'},
        {key:'mobile', label:'মোবাইল নম্বর', type:'tel'},
        {key:'startTime', label:'শুরু সময়', type:'time'},
        {key:'endTime', label:'শেষ সময়', type:'time'},
        {key:'approval', label:'অনুমোদন', type:'select', options:['Pending','Approved','Rejected']}
      ]
    },
    transfers: {
      label: 'বদলী রেকর্ড',
      fields: [
        {key:'date', label:'বদলীর তারিখ', type:'date'},
        {key:'toPrison', label:'বদলীকৃত যায়গার নাম', type:'text'},
        {key:'condition', label:'বন্দির অবস্থা', type:'text'},
        {key:'officer', label:'যার দায়িত্বে বদলী', type:'text'},
        {key:'designation', label:'পদবী', type:'text'},
        {key:'mobile', label:'মোবাইল নম্বর', type:'tel'}
      ]
    },
    remands: {
      label: 'রিমান্ড তথ্য',
      fields: [
        {key:'remandDate', label:'রিমান্ডের তারিখ', type:'date'},
        {key:'remandDivision', label:'রিমান্ড গ্রহণকারী বিভাগের নাম', type:'text'},
        {key:'remandVia', label:'যার মাধ্যমে রিমান্ড হয়েছে', type:'text'},
        {key:'remandDuration', label:'রিমান্ডের সময়', type:'text'},
        {key:'remandReturnDate', label:'ফেরত পাওয়ার তারিখ', type:'date'}
      ]
    }
  };

  const caseConfig = {
    label: 'মামলা',
    fields: [
{
    key: 'section',
    label: 'মামলার প্রকৃতি/নাম',
    type: 'select',
    options: [
        '',
        'হত্যা (Murder)',
        'হত্যাচেষ্টা (Attempt to Murder)',
        'চুরি (Theft)',
        'বাড়ি/দোকানে চুরি (Burglary)',
        'ছিনতাই (Robbery/Snatching)',
        'ডাকাতি (Dacoity)',
        'অপহরণ (Kidnapping)',
        'ধর্ষণ (Rape)',
        'নারী ও শিশু নির্যাতন (Women & Children Repression)',
        'মাদক (Narcotics)',
        'অস্ত্র আইন (Arms Act)',
        'বিস্ফোরক আইন (Explosives Act)',
        'সন্ত্রাসবিরোধী (Anti-Terrorism)',
        'সাইবার অপরাধ (Cyber Crime)',
        'প্রতারণা ও জালিয়াতি (Fraud & Forgery)',
        'দুর্নীতি (Corruption)',
        'অর্থপাচার (Money Laundering)',
        'মানবপাচার (Human Trafficking)',
        'জুয়া (Gambling)',
        'দাঙ্গা (Riot)',
        'অগ্নিসংযোগ (Arson)',
        'ট্রাফিক অপরাধ (Traffic Crime)',
        'পরিবেশ অপরাধ (Environmental Crime)',
        'গার্হস্থ্য সহিংসতা (Domestic Violence)',
        'যৌতুক (Dowry)',
        'এসিড নিক্ষেপ (Acid Crime)',
        'বন্যপ্রাণী অপরাধ (Wildlife Crime)',
        'কারাগার-সংক্রান্ত অপরাধ (Prison Offence)',
        'অন্যান্য (Others)'
    ]
},      {key:'section', label:'মামলার ধারা', type:'text'},

      {key:'courtName', label:'আদালতের নাম', type:'text'},
      {key:'judgeName', label:'বিচারকের নাম', type:'text'},
      {key:'courtAddress', label:'কোর্টের ঠিকানা (বিভাগ ও জেলা)', type:'text'},
      {key:'caseType', label:'মামলার ধরন', type:'select', options:['GR','CR','MC','অন্যান্য']},
      {key:'caseNo', label:'মামলা নম্বর', type:'text'},
      {key:'caseDate', label:'মামলার তারিখ', type:'date'},
      {key:'policeStation', label:'মামলার থানার নাম, জেলা ও বিভাগ', type:'text'},
      {key:'arrivalDate', label:'জেলে আগমনের তারিখ', type:'date'},
      {key:'arrestedBy', label:'কার মাধ্যমে গ্রেফতার হয়েছে', type:'text'},
      {key:'warrantNo', label:'ওয়ারেন্ট নম্বর', type:'text'},
      {key:'courtAppearanceDate', label:'কোর্টে হাজিরার তারিখ', type:'date'},
      {key:'courtAppearanceName', label:'আদালতের নাম ও ঠিকানা', type:'text'},
      {key:'courtReturnDate', label:'কোর্ট থেকে ফেরার তারিখ ও সময়', type:'datetime-local'},
      {key:'sentenceDate', label:'সাজার তারিখ', type:'date'},
      {key:'sentenceCourt', label:'সাজার কোর্টের নাম', type:'text'},
      {key:'sentenceDuration', label:'সাজার মেয়াদ', type:'text'},
      {key:'possibleReleaseDate', label:'সম্ভাব্য মুক্তির তারিখ', type:'date'},
      {key:'remissionDetails', label:'রিমিশনের তথ্য', type:'text'},
      {key:'remandDate', label:'রিমান্ডের তারিখ', type:'date'},
      {key:'remandDivision', label:'রিমান্ড গ্রহণকারী বিভাগের নাম', type:'text'},
      {key:'remandVia', label:'যার মাধ্যমে যাচ্ছে তার তথ্য', type:'text'},
      {key:'remandDuration', label:'রিমান্ডের সময়', type:'text'},
      {key:'remandReturnDate', label:'ফেরত পাওয়ার তারিখ', type:'date'},
      {key:'appealDate', label:'আপিলের তারিখ', type:'date'},
      {key:'appealDivision', label:'বিভাগের নাম', type:'text'},
      {key:'appealLawyer', label:'ওকিলের নাম', type:'text'},
      {key:'appealSubmissionNo', label:'আবেদন নম্বর', type:'text'},
      {key:'bailDate', label:'জামিনের তারিখ', type:'date'},
      {key:'bailCourt', label:'কোর্টের নাম', type:'text'},
      {key:'bailJudge', label:'বিচারকের নাম', type:'text'},
      {key:'bailRefNo', label:'স্মারক নং', type:'text'},
      {key:'bailRefDate', label:'স্মারকের তারিখ', type:'date'}
    ]
  };

  document.querySelectorAll('[data-grid-add]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const grid = btn.getAttribute('data-grid-add');
      addGridRow(grid, btn);
    });
  });

  document.querySelectorAll('[data-grid-clear]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      clearGridInputs(btn);
    });
  });

  const btnAddCase = document.getElementById('btnAddCase');
  if(btnAddCase) btnAddCase.addEventListener('click', ()=> addCaseCard());

  function addGridRow(gridName, btn){
    const config = gridConfigurations[gridName];
    if(!config) return showToast('Grid configuration not found: ' + gridName,'error');
    const row = btn.closest('.row');
    if(!row) return showToast('Input row not found for this grid','error');

    const values = {};
    let hasValue = false;
    row.querySelectorAll('[data-f]').forEach(input=>{
      values[input.getAttribute('data-f')] = input.value || '';
      if(input.value && input.value.toString().trim() !== '') hasValue = true;
    });

    if(!hasValue) return showToast('প্রথমে কিছু তথ্য লিখুন','error');

    const container = document.getElementById('grid-' + gridName);
    if(!container) return showToast('Grid container not found: ' + gridName,'error');

    container.prepend(createRowCard(config, values));
    row.querySelectorAll('[data-f]').forEach(input=>{
      if(input.type === 'checkbox' || input.type === 'radio') input.checked = false;
      else input.value = '';
    });
    showToast('নতুন রেকর্ড যোগ করা হয়েছে');
  }

  function clearGridInputs(btn){
    const row = btn.closest('.row');
    if(!row) return;
    row.querySelectorAll('[data-f]').forEach(input=>{
      if(input.type === 'checkbox' || input.type === 'radio') input.checked = false;
      else input.value = '';
    });
    showToast('ইনপুট ক্লিয়ার করা হয়েছে','success');
  }

  function addCaseCard(values = {}){
    const container = document.getElementById('caseContainer');
    if(!container) return showToast('Case container not available','error');
    const card = createRowCard(caseConfig, values, 'নতুন মামলা');
    container.prepend(card);
    showEditModal('case', 'নতুন মামলা', card);
  }

  function createRowCard(config, values, customTitle){
    const card = document.createElement('div');
    card.className = 'case-card';
    card.rowValues = {...values};
    const title = customTitle || values.nameBn || values.nameEn || values.examName || values.hospital || values.callDate || values.date || values.toPrison || values.caseNo || config.label;

    card.innerHTML = `
      <div class="case-card-head">
        <div class="case-card-head-left">
          <div class="case-num-badge">${escapeHtml(config.label)}</div>
          <input class="case-title-input" value="${escapeHtml(title)}">
        </div>
        <div class="case-card-head-actions">
          <button class="btn-ent" type="button" data-edit-row title="সম্পাদনা"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-ent" type="button" data-duplicate-row title="ডুপ্লিকেট"><i class="fa-solid fa-clone"></i></button>
          <button class="btn-ent" type="button" data-remove-row title="মুছে ফেলুন"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="case-card-body">${renderGridValues(card.rowValues, config.fields)}</div>
    `;

    card.querySelector('[data-remove-row]').addEventListener('click', ()=> card.remove());
    card.querySelector('[data-duplicate-row]').addEventListener('click', ()=>{
      const container = card.parentElement;
      if(container) container.prepend(createRowCard(config, {...card.rowValues}));
      showToast('রেকর্ড ডুপ্লিকেট হয়েছে');
    });
    card.querySelector('[data-edit-row]').addEventListener('click', ()=> showEditModal(config === caseConfig ? 'case' : Object.keys(gridConfigurations).find(key=>gridConfigurations[key] === config), config.label, card));

    return card;
  }

  function renderGridValues(values, fields){
    const rows = fields.map(field => {
      const value = values[field.key] || '';
      return `<div class="grid-card-row"><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(value)}</span></div>`;
    }).join('');
    return `<div class="grid-card-list">${rows}</div>`;
  }

  function showEditModal(gridName, title, card){
    const config = gridName === 'case' ? caseConfig : gridConfigurations[gridName];
    if(!config) return showToast('কনফিগারেশন পাওয়া যায়নি','error');

    const modalBody = document.getElementById('editModalBody');
    const modalTitle = document.getElementById('editModalTitle');
    const editModalSave = document.getElementById('editModalSave');
    modalTitle.textContent = `${title} সম্পাদনা করুন`;
    modalBody.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'row g-3';
    config.fields.forEach(field => {
      const col = document.createElement('div');
      col.className = field.type === 'textarea' ? 'col-12' : 'col-md-6';
      col.innerHTML = renderFieldInput(field, card.rowValues[field.key] || '');
      form.appendChild(col);
    });
    modalBody.appendChild(form);

    const bsModal = new bootstrap.Modal(document.getElementById('editModal'));
    bsModal.show();

    const handleSave = () => {
      const updated = gatherModalValues(form, config.fields);
      card.rowValues = updated;
      const newTitle = updated[config.fields[0].key] || title;
      const titleInput = card.querySelector('.case-title-input');
      if(titleInput) titleInput.value = newTitle;
      const body = card.querySelector('.case-card-body');
      if(body) body.innerHTML = renderGridValues(updated, config.fields);
      bsModal.hide();
      showToast('রেকর্ড আপডেট হয়েছে');
    };

    editModalSave.removeEventListener('click', handleSave);
    editModalSave.addEventListener('click', handleSave, {once:true});
  }

  function renderFieldInput(field, value){
    const name = field.key;
    if(field.type === 'textarea'){
      return `<label class="f-label">${escapeHtml(field.label)}</label><textarea class="f-control" name="${name}" rows="2">${escapeHtml(value)}</textarea>`;
    }
    if(field.type === 'select'){
      const options = (field.options || []).map(option => `<option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('');
      return `<label class="f-label">${escapeHtml(field.label)}</label><select class="f-control" name="${name}">${options}</select>`;
    }
    return `<label class="f-label">${escapeHtml(field.label)}</label><input class="f-control" type="${field.type || 'text'}" name="${name}" value="${escapeHtml(value)}">`;
  }

  function gatherModalValues(form, fields){
    const data = {};
    fields.forEach(field => {
      const input = form.querySelector(`[name="${field.key}"]`);
      if(input) data[field.key] = input.value || '';
    });
    return data;
  }

  function escapeHtml(unsafe){
    if(typeof unsafe !== 'string') return unsafe === undefined || unsafe === null ? '' : String(unsafe);
    return unsafe.replace(/[&<>"]+/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[match]));
  }

});
