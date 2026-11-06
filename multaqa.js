/* Vanilla JavaScript: filtering, saved events, accessible feedback and static calendar links. */
(() => {
  'use strict';
  const {events,categories,places}=window.multaqa;
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
  const keys={saved:'multaqa_202320_saved_v1',theme:'multaqa_202320_theme_v1',category:'multaqa_202320_category_v1'};
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const stored=read(keys.saved,[]);
  let saved=new Set(Array.isArray(stored)?stored.filter(id=>events.some(event=>event.id===id)):[]);
  const category=id=>categories.find(item=>item.id===id);
  const place=id=>places.find(item=>item.id===id);
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize=value=>String(value).toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim();
  const dateLabel=date=>new Date(date+'T12:00:00+03:00').toLocaleDateString('ar-SY',{day:'numeric',month:'long'});
  const monthLabel=date=>date.slice(5,7)==='11'?'نوفمبر':'ديسمبر';
  const weekday=date=>new Date(date+'T12:00:00+03:00').toLocaleDateString('ar-SY',{weekday:'long'});
  const eventMatches=(event,filters,favourites=saved)=>{
    if(filters.category&&event.category!==filters.category)return false;
    if(filters.date&&event.date!==filters.date)return false;
    if(filters.place&&event.place!==filters.place)return false;
    if(filters.saved&&!favourites.has(event.id))return false;
    const haystack=[event.title,event.english,event.intro,event.body,category(event.category).name,place(event.place).name].join(' ');
    return !filters.q||normalize(haystack).includes(normalize(filters.q));
  };
  function filterProgram(list,filters={},favourites=saved){
    const filtered=list.filter(event=>eventMatches(event,filters,favourites));
    return filtered.sort(filters.sort==='newest'?(a,b)=>b.newest-a.newest:filters.sort==='title'?(a,b)=>a.title.localeCompare(b.title,'ar'):(a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }
  let toastTimer;
  function notify(message){const box=$('#status-toast');box.textContent=message;box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{box.hidden=true;},3500);}
  function saveButton(event,full=false){return `<button type="button" class="${full?'':'save-button'}" data-save="${event.id}" aria-pressed="${saved.has(event.id)}" aria-label="${saved.has(event.id)?'إزالة':'حفظ'} ${esc(event.title)} في المفضلة">${full?'♡ '+(saved.has(event.id)?'محفوظة':'احفظ الموعد'):(saved.has(event.id)?'♥':'♡')}</button>`;}
  function card(event){return `<div class="col-md-6 col-xl-4"><article class="ticket-card card"><div class="card-photo"><a href="event.html?id=${event.id}" tabindex="-1" aria-hidden="true"><img src="assets/img/${event.image}" alt="${esc(event.alt)}" loading="lazy" width="1440" height="960"></a><span class="tag">${category(event.category).symbol} ${category(event.category).name}</span>${saveButton(event)}</div><div class="card-body"><h3><a href="event.html?id=${event.id}">${esc(event.title)}</a></h3><p>${esc(event.intro)}</p><div class="card-location"><span aria-hidden="true">◎</span> ${place(event.place).name} · <bdi>${event.time}</bdi></div></div><div class="ticket-bottom"><div class="ticket-date"><b>${Number(event.date.slice(-2))}</b><span>${monthLabel(event.date)}<br>${weekday(event.date)}</span></div><a href="event.html?id=${event.id}">التفاصيل ↖</a></div></article></div>`;}
  function syncSaved(){
    $$('[data-saved-count]').forEach(node=>{node.textContent=saved.size;});
    $$('[data-save]').forEach(button=>{const event=events.find(item=>item.id===button.dataset.save);if(!event)return;const active=saved.has(event.id);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${active?'إزالة':'حفظ'} ${event.title} في المفضلة`);button.textContent=button.classList.contains('save-button')?(active?'♥':'♡'):'♡ '+(active?'محفوظة':'احفظ الموعد');});
  }
  let refreshResults;
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-save]');
    if(button){const id=button.dataset.save;if(!events.some(item=>item.id===id))return;if(saved.has(id)){saved.delete(id);notify('شِلنا الفعالية من مفضلتك.');}else{saved.add(id);notify('انحفظت الفعالية على هالمتصفح.');}if(!write(keys.saved,[...saved]))notify('حفظنا الاختيار لهالجلسة؛ التخزين المحلي غير متاح.');syncSaved();if(refreshResults)refreshResults();return;}
    const photo=event.target.closest('[data-photo]');
    if(photo){$('#modal-photo').src=photo.dataset.photo;$('#modal-photo').alt=photo.dataset.alt;$('#photo-modal-title').textContent=photo.dataset.caption;window.bootstrap.Modal.getOrCreateInstance($('#photo-modal')).show();}
  });
  function initTheme(){const root=document.documentElement;const button=$('#theme-button');const apply=dark=>{root.dataset.theme=dark?'dark':'light';button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',dark?'تفعيل المظهر النهاري':'تفعيل المظهر الليلي');};apply(read(keys.theme,'light')==='dark');button.addEventListener('click',()=>{const dark=root.dataset.theme!=='dark';apply(dark);write(keys.theme,dark?'dark':'light');});}
  function home(){
    $('#interest-list').innerHTML=categories.map(item=>`<a href="events.html?category=${item.id}"><span class="interest-symbol" aria-hidden="true">${item.symbol}</span><strong>${item.name}</strong><span aria-hidden="true">↖</span></a>`).join('');
    $('#fresh-events').innerHTML=[...events].sort((a,b)=>b.newest-a.newest).slice(0,3).map(card).join('');
    const featured=events.filter(event=>event.featured);let position=0;
    function render(){const event=featured[position];$('#spotlight').innerHTML=`<a class="spotlight-photo" href="event.html?id=${event.id}" aria-label="تفاصيل ${esc(event.title)}"><img src="assets/img/${event.image}" alt="${esc(event.alt)}" width="1440" height="960" loading="lazy"></a><div class="spotlight-copy"><span class="tag">${category(event.category).name} / ${event.kind}</span><h3><a href="event.html?id=${event.id}">${event.title}</a></h3><p>${event.intro}</p><div class="spotlight-meta"><span>${dateLabel(event.date)}</span><span>${place(event.place).name}</span><bdi>${event.time}</bdi></div><div class="spotlight-footer"><a class="text-link" href="event.html?id=${event.id}">شو برنامج اللقاء؟ ↖</a>${saveButton(event)}</div></div>`;$('#spot-position').textContent=`${position+1} / ${featured.length}`;}
    $('#spot-next').addEventListener('click',()=>{position=(position+1)%featured.length;render();});$('#spot-prev').addEventListener('click',()=>{position=(position-1+featured.length)%featured.length;render();});render();
  }
  function listing(){
    const form=$('#filter-form'),query=new URLSearchParams(location.search),search=$('#search'),cat=$('#category'),date=$('#date'),venue=$('#place'),sort=$('#sort'),savedOnly=$('#saved-only'),remember=$('#remember-category');
    categories.forEach(item=>cat.add(new Option(item.name,item.id)));places.forEach(item=>venue.add(new Option(item.name,item.id)));
    const preference=read(keys.category,'');const preferred=categories.some(item=>item.id===preference)?preference:'';
    search.value=query.get('q')||'';cat.value=query.has('category')?query.get('category'):preferred;if(!cat.value)cat.value='';
    const selectedDate=query.get('date')||'';date.value=/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)?selectedDate:'';
    venue.value=query.get('place')||'';if(!venue.value)venue.value='';sort.value=['date','title','newest'].includes(query.get('sort'))?query.get('sort'):'date';savedOnly.checked=query.get('saved')==='1';remember.checked=Boolean(preferred);
    refreshResults=()=>{
      const filters={q:search.value.trim(),category:cat.value,date:date.value,place:venue.value,sort:sort.value,saved:savedOnly.checked};
      const result=filterProgram(events,filters);$('#result-count').textContent=`${result.length} من أصل ${events.length} فعاليات`;
      $('#event-results').innerHTML=result.length?result.map(card).join(''):`<div class="col-12"><div class="empty-state"><span aria-hidden="true">◎</span><h3>${filters.saved?'ما في فعاليات محفوظة بهالخيارات.':'ما لقينا فعالية بهالخيارات.'}</h3><p>جرّب تخفف الفلاتر أو تضغط مسح الفلاتر لعرض البرنامج كامل.</p><button class="btn btn-purple" type="button" data-clear-results>عرض كل الفعاليات</button></div></div>`;
      const params=new URLSearchParams();for(const key of ['q','category','date','place'])if(filters[key])params.set(key,filters[key]);if(filters.sort!=='date')params.set('sort',filters.sort);if(filters.saved)params.set('saved','1');
      try{history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():''));}catch{/* file:// preview may restrict history updates. */}
      if(remember.checked)write(keys.category,cat.value);else write(keys.category,'');
    };
    function clear(){search.value='';cat.value='';date.value='';venue.value='';sort.value='date';savedOnly.checked=false;remember.checked=false;write(keys.category,'');refreshResults();}
    form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',refreshResults);form.addEventListener('change',refreshResults);$('#clear-filters').addEventListener('click',clear);$('#event-results').addEventListener('click',event=>{if(event.target.closest('[data-clear-results]'))clear();});refreshResults();
  }
  function detail(){
    const id=new URLSearchParams(location.search).get('id'),event=events.find(item=>item.id===id),root=$('#event-detail');
    if(!event){document.title='الفعالية غير موجودة | ملتقى الجامعة';root.innerHTML='<section class="wrap missing-event"><span class="eyebrow">الرابط بحاجة مراجعة</span><h1>هالفعالية مو موجودة بالبرنامج.</h1><p>المعرّف ناقص أو غير صحيح. تقدر تختار فعالية من القائمة.</p><a class="btn btn-purple" href="events.html">افتح البرنامج ↖</a></section><section class="wrap small-callout"><div><h2>عم تدور على موعد؟</h2><p>البحث والفلاتر بيساعدوك تلاقي الفعالية المناسبة.</p></div><a class="text-link" href="events.html">شوف الخيارات</a></section><section class="wrap small-callout"><div><h2>لاحظت رابطاً ناقصاً؟</h2><p>راجع العنوان أو افتح صفحة التواصل.</p></div><a class="text-link" href="contact.html">احكي معنا</a></section>';return;}
    const venue=place(event.place);document.title=event.title+' | ملتقى الجامعة';
    const related=events.filter(item=>item.id!==id).sort((a,b)=>Number(b.category===event.category)-Number(a.category===event.category)).slice(0,3);
    root.innerHTML=`<div class="wrap"><nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="index.html">الرئيسية</a><span>/</span><a href="events.html">الفعاليات</a><span>/</span><span>${esc(event.title)}</span></nav><section class="detail-banner" aria-labelledby="detail-title"><div class="detail-title"><span class="tag">${category(event.category).name} / ${event.kind}</span><h1 id="detail-title">${event.title}</h1><p>${event.intro}</p><span class="eyebrow light">${weekday(event.date)} · ${dateLabel(event.date)} 2026</span></div><img src="assets/img/${event.image}" alt="${esc(event.alt)}" width="1440" height="960"></section></div>
    <section class="section wrap detail-columns" aria-labelledby="story-title"><div class="detail-story"><h2 id="story-title">عن التجربة</h2><p>${event.body}</p><h2>قبل ما تجي</h2><p>${event.bring}</p><h2>كيف رح يمشي اللقاء؟</h2><ol class="schedule">${event.plan.map(([time,text])=>`<li><time>${time}</time><span>${text}</span></li>`).join('')}</ol><h2>صور من أجواء الفكرة</h2><p class="muted">صور توضيحية لنوع النشاط. اضغط لتكبيرها.</p><div class="gallery-strip">${event.gallery.map((file,i)=>`<button type="button" data-photo="assets/img/${file}" data-alt="${esc(i===0?event.alt:'صورة تعبّر عن التعلم والتجربة المشتركة')}" data-caption="${esc(event.title)} — صورة ${i+1}" aria-label="تكبير الصورة ${i+1}"><img src="assets/img/${file}" alt="${esc(i===0?event.alt:'التجربة والعمل المشترك')}" loading="lazy"><span>تكبير ↗</span></button>`).join('')}</div></div><aside class="event-pass" aria-label="بطاقة الموعد"><span class="pass-label">احتفظ بالتفاصيل</span><h2>${dateLabel(event.date)}</h2><span class="muted">${weekday(event.date)} · 2026</span><dl><div><dt>الوقت</dt><dd><bdi>${event.time}</bdi></dd></div><div><dt>المدة</dt><dd>${event.minutes} دقيقة</dd></div><div><dt>المكان</dt><dd>${venue.name}</dd></div><div><dt>طبيعة اللقاء</dt><dd>${event.kind}</dd></div></dl><a class="btn btn-purple" href="assets/calendar/${event.id}.ics" download>أضف للتقويم +</a><div class="pass-actions">${saveButton(event,true)}<button type="button" id="share-event">شارك ↗</button></div><small>المفضلة تحفظ اختيارك على هذا المتصفح فقط، ولا تمثل تسجيل حضور. وقت التقويم مضبوط على توقيت دمشق.</small><div id="share-fallback" hidden><label class="form-label mt-3" for="share-url">انسخ الرابط يدوياً</label><input class="form-control" id="share-url" readonly dir="ltr"></div></aside></section>
    <section class="section location-section" aria-labelledby="location-title"><div class="wrap location-grid"><div><span class="eyebrow">خلي الطريق واضح</span><h2 id="location-title">${venue.name}</h2><p>${venue.hint}</p><p>${event.place==='online'?'لا توجد بيانات وصول منشورة لهذا اللقاء المقترح. تُحدّث التفاصيل قبل اعتماد الفعالية.':'الخريطة مخطط إرشادي لمكان مقترح داخل المشروع، وليست خريطة لحرم جامعي فعلي.'}</p></div><img class="map-image" src="assets/img/${venue.map}" alt="${event.place==='online'?'رسم يوضح أن اللقاء عبر الإنترنت':'مخطط موقع '+venue.name+' بالنسبة للبوابة والساحة'}" width="600" height="380" loading="lazy"></div></section>
    <section class="section wrap related-section" aria-labelledby="related-title"><div class="section-head"><div><span class="eyebrow">يمكن يعجبوك كمان</span><h2 id="related-title">كمّل تجربتك</h2></div><a class="text-link" href="events.html">كل البرنامج ↖</a></div><div class="row g-4">${related.map(card).join('')}</div></section>`;
    $('#share-event').addEventListener('click',async()=>{const url=new URL('event.html?id='+event.id,location.href).href;try{if(navigator.share){await navigator.share({title:event.title,text:event.intro,url});return;}if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);notify('نسخنا رابط الفعالية.');return;}}catch(error){if(error.name==='AbortError')return;}$('#share-url').value=url;$('#share-fallback').hidden=false;$('#share-url').focus();$('#share-url').select();notify('الرابط جاهز للنسخ اليدوي.');});
  }
  function validateContact(values){const errors={};if(!values.name.trim())errors.name='اكتب اسمك حتى نعرف كيف نناديك.';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))errors.email='اكتب بريداً إلكترونياً بصيغة صحيحة.';if(!values.message.trim())errors.message='اكتب رسالتك قبل التحقق.';return errors;}
  function contact(){const form=$('#contact-form'),fields={name:$('#full-name'),email:$('#email'),message:$('#message')};
    form.addEventListener('submit',event=>{event.preventDefault();const errors=validateContact(Object.fromEntries(Object.entries(fields).map(([key,node])=>[key,node.value])));for(const [key,node] of Object.entries(fields)){node.classList.toggle('is-invalid',Boolean(errors[key]));node.setAttribute('aria-invalid',String(Boolean(errors[key])));$('#'+key+'-error').textContent=errors[key]||'';}
      const invalid=Object.keys(errors);$('#contact-result').innerHTML=invalid.length?'<div class="alert alert-danger" role="alert">راجع الحقول المعلّمة، وبعدها جرّب من جديد.</div>':'<div class="alert alert-success" role="status">المعلومات صحيحة وصارت رسالتك جاهزة. هذا النموذج يتحقق على المتصفح فقط؛ لم تُرسل الرسالة أو تُحفظ على خادم.</div>';if(invalid.length)fields[invalid[0]].focus();});
    Object.values(fields).forEach(node=>node.addEventListener('input',()=>{if(node.classList.contains('is-invalid')){node.classList.remove('is-invalid');node.removeAttribute('aria-invalid');}$('#contact-result').innerHTML='';}));
  }
  initTheme();syncSaved();if(document.body.dataset.page==='home')home();if(document.body.dataset.page==='events')listing();if(document.body.dataset.page==='event')detail();if(document.body.dataset.page==='contact')contact();syncSaved();
  const top=$('#back-top');window.addEventListener('scroll',()=>{top.hidden=window.scrollY<500;},{passive:true});top.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  /* Load the required CDN copy after first render; insert it BEFORE our custom CSS. */
  window.addEventListener('load',()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.rtl.min.css';document.head.insertBefore(link,$('[data-site-style]'));},{once:true});
  window.MultaqaTools={normalize,filterProgram,validateContact};
})();
