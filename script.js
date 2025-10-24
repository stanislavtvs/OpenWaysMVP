    /* ======================================================
       1) Исходные точки (реальные координаты, Павлодар)
       ====================================================== */
    const PLACES = [
      {
        id: 'mosque',
        name: 'Центральная мечеть Павлодара',
        address: 'ул. Академика Маргулана, 149',
        coords: [52.29903, 76.93885],
        features: { ramp: true, elevator: false, wc: false, tactile: false },
        access: 'partial',
        desc: 'Пандус у главного входа. Лифта и тактильной плитки нет.'
      },
      {
        id: 'batyrmall',
        name: 'ТРЦ «Batyr Mall»',
        address: 'пр. Назарбаева, 1/1',
        coords: [52.28963, 76.95417],
        features: { ramp: true, elevator: true, wc: true, tactile: true },
        access: 'full',
        desc: 'Полностью доступен: пандус, лифты, доступный туалет, тактильная плитка.'
      },
      {
        id: 'clinic2',
        name: 'Поликлиника №2',
        address: 'ул. Академика Сатпаева, 36',
        coords: [52.28363, 76.95860],
        features: { ramp: true, elevator: false, wc: true, tactile: false },
        access: 'partial',
        desc: 'Пандус у входа, лифта нет; доступный туалет.'
      },
      {
        id: 'school25',
        name: 'Школа-лицей №25',
        address: 'ул. Ломова, 90',
        coords: [52.27541, 76.98070],
        features: { ramp: false, elevator: false, wc: false, tactile: false },
        access: 'none',
        desc: 'Нет пандуса и лифта, туалет недоступен.'
      }
    ];

    /* ======================================================
       2) Карта и базовые слои
       ====================================================== */
    const map = L.map('map', { zoomControl:true, attributionControl:true })
                 .setView([52.29, 76.96], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer  = L.layerGroup().addTo(map);

    function setDebug(msg){ document.getElementById('debug').textContent = msg; }

    /* ======================================================
       3) Маркеры-доступности (divIcon + эмодзи)
       ====================================================== */
    function colorByAccessHex(a){
      if(a==='full')    return '#22c55e';
      if(a==='partial') return '#eab308';
      return '#ef4444';
    }

    function featureEmojis(place){
      const arr=[];
      if(place.features.ramp) arr.push('♿');
      if(place.features.elevator) arr.push('🛗');
      if(place.features.wc) arr.push('🚻');
      if(place.features.tactile) arr.push('🚶');
      return arr.slice(0,3); // максимум три
    }

    function makeDivIcon(place){
      const emojis = featureEmojis(place).map(e=>`<span>${e}</span>`).join('');
      const bg = colorByAccessHex(place.access);
      return L.divIcon({
        className:'',
        html:`<div class="ow-marker" style="background:${bg};"><div class="stack">${emojis||'•'}</div></div>`,
        iconSize:[36,36], iconAnchor:[18,18], popupAnchor:[0,-18]
      });
    }

    /* ======================================================
       4) Фильтры (логика ИЛИ)
       ====================================================== */
    const filters = { ramp:true, elevator:true, wc:true, tactile:true };

    function passFilters(p){
      const active = Object.keys(filters).filter(k=>filters[k]);
      if(active.length===0) return true;
      return active.some(k=>p.features[k]);
    }

    function renderMarkers(){
      markersLayer.clearLayers();
      let visible = 0;
      PLACES.forEach(p=>{
        if(!passFilters(p)) return;
        const m = L.marker(p.coords, { icon: makeDivIcon(p), title:p.name }).addTo(markersLayer);
        m.on('click', ()=>openPlaceSheet(p));
        visible++;
      });
      setDebug(`markers rendered: ${visible}`);
      document.getElementById('s-total').textContent = PLACES.length;
      document.getElementById('s-visible').textContent = visible;
    }

    function fitToVisible(){
      const coords = PLACES.filter(passFilters).map(p=>p.coords);
      if(coords.length){
        map.fitBounds(L.latLngBounds(coords), { padding:[40,40] });
      }
    }

    /* ======================================================
       5) Нижняя карточка (place/route)
       ====================================================== */
    const sheet = document.getElementById('sheet');
    const title = document.getElementById('place-title');
    const addr  = document.getElementById('place-address');
    const desc  = document.getElementById('place-desc');
    const tags  = document.getElementById('place-tags');

    function tag(icon, label, color='#22c55e'){
      return `<div class="tag"><div class="icon-badge" style="background:${color}">${icon}</div>${label}</div>`;
    }

    function openPlaceSheet(p){
      title.textContent = p.name;
      addr.textContent  = p.address || '—';
      desc.textContent  = p.desc || '';
      tags.innerHTML = '';
      if(p.features.ramp)     tags.innerHTML += tag('♿', 'Пандус', '#22c55e');
      if(p.features.elevator) tags.innerHTML += tag('🛗', 'Лифт', '#22c55e');
      if(p.features.wc)       tags.innerHTML += tag('🚻', 'Доступный туалет', '#22c55e');
      if(p.features.tactile)  tags.innerHTML += tag('🚶', 'Тактильная плитка', '#22c55e');
      const st = p.access==='full'?'Доступно':p.access==='partial'?'Частично':'Недоступно';
      tags.innerHTML += tag('●', st, colorByAccessHex(p.access));
      sheet.classList.add('open');
    }

    function openRouteSheet(r, labelColor='#22c55e', labelText='Маршрут'){
      title.textContent = `Маршрут: ${r.name}`;
      addr.textContent  = '';
      desc.textContent  = r.desc || '';
      tags.innerHTML    = tag('—', labelText, labelColor);
      sheet.classList.add('open');
    }

    document.getElementById('btn-hide-sheet').addEventListener('click', ()=>sheet.classList.remove('open'));
    map.on('click', ()=>sheet.classList.remove('open'));

    /* ======================================================
       6) Маршруты по дорогам (OSRM, walking)
       ====================================================== */
    // Определения маршрутов (логические пары точек)
    const ROUTES_DEF = [
      { name:'Мечеть → Batyr Mall', from:'mosque',   to:'batyrmall', color:'#22c55e', desc:'В целом доступный маршрут.' },
      { name:'Batyr Mall → Поликлиника №2', from:'batyrmall', to:'clinic2', color:'#eab308', desc:'Встречаются участки со средней доступностью.' },
      { name:'Поликлиника №2 → Школа-лицей №25', from:'clinic2', to:'school25', color:'#ef4444', desc:'К местами путь проблемный.' }
    ];
    const id2place = Object.fromEntries(PLACES.map(p=>[p.id, p]));

    // Счётчики статистики по сегментам
    let totalSegs = 0;
    let greenSegs = 0;

    // Вспомогательная: вытянуть координаты маршрута через OSRM
    async function fetchOsrmRoute(a, b, profile='walking'){
      const src = `${a[1]},${a[0]}`;      // lon,lat
      const dst = `${b[1]},${b[0]}`;      // lon,lat
      const url = `https://router.project-osrm.org/route/v1/${profile}/${src};${dst}?overview=full&geometries=geojson`;
      const r = await fetch(url);
      if(!r.ok) throw new Error('OSRM HTTP ' + r.status);
      const data = await r.json();
      if(!data.routes || !data.routes[0]) throw new Error('OSRM: route not found');
      const coords = data.routes[0].geometry.coordinates.map(([lon,lat]) => [lat,lon]);
      return coords;
    }

    // Разбивка на сегменты: 80% зелёный, 15% жёлтый, 5% красный
    function splitToColoredSegments(coords){
      const len = coords.length;
      if(len < 3){
        // слишком коротко — просто зелёная линия
        return [{ color:'#22c55e', coords }];
      }
      const gEnd = Math.max(2, Math.floor(len * 0.80));
      const yEnd = Math.max(gEnd+1, Math.floor(len * 0.95));
      const green  = coords.slice(0, gEnd);
      const yellow = coords.slice(gEnd-1, yEnd);  // -1 чтобы стык не оставлял разрыв
      const red    = coords.slice(yEnd-1);

      const parts = [];
      if(green.length  > 1) parts.push({ color:'#22c55e', coords: green  });
      if(yellow.length > 1) parts.push({ color:'#eab308', coords: yellow });
      if(red.length    > 1) parts.push({ color:'#ef4444', coords: red    });
      return parts;
    }

    // Построение сегментированного маршрута
    async function buildSegmentedRoute(fromCoords, toCoords){
      try{
        const coords = await fetchOsrmRoute(fromCoords, toCoords, 'walking');
        return splitToColoredSegments(coords);
      }catch(err){
        console.warn('OSRM failed, fallback straight line', err);
        // если OSRM недоступен — прямая линия (один сегмент базового цвета)
        return [{ color:'#22c55e', coords:[fromCoords, toCoords], fallback:true }];
      }
    }

    // Отрисовка всех маршрутов
    async function drawRoutes(){
      // обнулить счётчики
      totalSegs = 0;
      greenSegs = 0;

      routesLayer.clearLayers();

      for(const def of ROUTES_DEF){
        const A = id2place[def.from].coords;
        const B = id2place[def.to].coords;

        const segments = await buildSegmentedRoute(A, B);

        segments.forEach((seg, idx)=>{
          const line = L.polyline(seg.coords, {
            color: seg.color,
            weight: 6,
            opacity: 0.85
          }).addTo(routesLayer);

          // Статистика
          totalSegs++;
          if(seg.color === '#22c55e') greenSegs++;

          // Tooltip при наведении
          const label =
            seg.color === '#22c55e' ? 'Доступный участок' :
            seg.color === '#eab308' ? 'Частичная доступность' :
            'Недоступный участок';
          line.bindTooltip(label, { sticky:true });

          // Клик по отрезку — открыть карточку маршрута
          line.on('click', ()=>{
            const nice =
              seg.color === '#22c55e' ? {txt:'Доступен', color:'#22c55e'} :
              seg.color === '#eab308' ? {txt:'Средняя доступность', color:'#eab308'} :
                                        {txt:'Недоступен', color:'#ef4444'};
            openRouteSheet(def, nice.color, nice.txt);
          });
        });
      }

      // Обновить мини-статистику
      document.getElementById('s-segs').textContent = totalSegs;
      const greenShare = totalSegs ? Math.round((greenSegs/totalSegs)*100) : 0;
      document.getElementById('s-green').textContent = greenShare + '%';
    }

    /* ======================================================
       7) UI-кнопки и события
       ====================================================== */
    // Фильтры
    document.getElementById('flt-ramp').addEventListener('change', e=>{ filters.ramp=e.target.checked; renderMarkers(); });
    document.getElementById('flt-elevator').addEventListener('change', e=>{ filters.elevator=e.target.checked; renderMarkers(); });
    document.getElementById('flt-wc').addEventListener('change', e=>{ filters.wc=e.target.checked; renderMarkers(); });
    document.getElementById('flt-tactile').addEventListener('change', e=>{ filters.tactile=e.target.checked; renderMarkers(); });

    // Показать всё (fit)
    document.getElementById('btn-fit').addEventListener('click', fitToVisible);

    // Скрыть карточку
    document.getElementById('btn-hide-sheet').addEventListener('click', ()=>sheet.classList.remove('open'));

    // Переключатель маршрутов
    let routesVisible = false;
    const toggleBtn = document.getElementById('btn-toggle-routes');
    toggleBtn.addEventListener('click', async ()=>{
      if(!routesVisible){
        // показать
        await drawRoutes();
        routesVisible = true;
        toggleBtn.textContent = 'Скрыть маршруты';
      }else{
        // скрыть
        routesLayer.clearLayers();
        routesVisible = false;
        toggleBtn.textContent = 'Показать маршруты';
        // статистику обнулим визуально
        document.getElementById('s-segs').textContent = '0';
        document.getElementById('s-green').textContent = '—';
      }
    });

    // Модалка добавления (по желанию)
    const modal = document.getElementById('modal');
    const inName = document.getElementById('in-name');
    const inAddress = document.getElementById('in-address');
    const inLat = document.getElementById('in-lat');
    const inLng = document.getElementById('in-lng');
    const inRamp = document.getElementById('in-ramp');
    const inElev = document.getElementById('in-elevator');
    const inWc = document.getElementById('in-wc');
    const inTact = document.getElementById('in-tactile');
    const inDesc = document.getElementById('in-desc');

    document.getElementById('btn-add').addEventListener('click', ()=>{
      inName.value=''; inAddress.value=''; inLat.value=''; inLng.value='';
      inRamp.checked = inElev.checked = inWc.checked = inTact.checked = false;
      inDesc.value='';
      modal.classList.add('open');
    });
    document.getElementById('btn-cancel').addEventListener('click', ()=>modal.classList.remove('open'));

    // Клик по карте — автоподстановка координат в модалке
    map.on('click', (e)=>{
      if(modal.classList.contains('open')){
        inLat.value = e.latlng.lat.toFixed(6);
        inLng.value = e.latlng.lng.toFixed(6);
      }
    });

    // Сохранение новой точки
    document.getElementById('btn-save').addEventListener('click', ()=>{
      const name = (inName.value||'').trim();
      if(!name){ alert('Введите название'); return; }
      const lat = parseFloat(inLat.value), lng = parseFloat(inLng.value);
      if(!isFinite(lat) || !isFinite(lng)){ alert('Укажите корректные координаты'); return; }

      const place = {
        id: 'user_'+Date.now(),
        name, address:(inAddress.value||'').trim(),
        coords:[lat,lng],
        features:{
          ramp:!!inRamp.checked, elevator:!!inElev.checked, wc:!!inWc.checked, tactile:!!inTact.checked
        },
        // Простейшая оценка сводного статуса
        access: (inRamp.checked||inElev.checked||inWc.checked||inTact.checked)
                  ? (inElev.checked&&inRamp.checked&&inWc.checked ? 'full' : 'partial')
                  : 'none',
        desc:(inDesc.value||'').trim()
      };

      PLACES.push(place);
      renderMarkers();
      modal.classList.remove('open');
      openPlaceSheet(place);
    });

    /* ======================================================
       8) Старт
       ====================================================== */
    renderMarkers();
    fitToVisible();
    setDebug('ready');

    // Если хочешь, чтобы маршруты рисовались сразу — раскомментируй:
    // (async ()=>{ await drawRoutes(); routesVisible = true; toggleBtn.textContent='Скрыть маршруты'; })();
