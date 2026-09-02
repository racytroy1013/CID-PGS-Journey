const road = document.querySelector('.road-wrap');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        road.classList.add('in-view');
        io.unobserve(road);
      }
    });
  }, { threshold: 0.25 });
  io.observe(road);

  /* Rocket: moves along the actual road path to whichever year is selected */
  const roadPath = document.getElementById('roadPath');
  const rocket = document.getElementById('rocket');
  const rocketTag = document.getElementById('rocketTag');
  const segA = document.getElementById('segA');
  const segB = document.getElementById('segB');

  const yearLengths = {
    2025: 0,
    2026: segA.getTotalLength(),
    2027: segB.getTotalLength(),
    2028: roadPath.getTotalLength()
  };

  let currentLen = 0;
  let animFrame = null;

  function angleAtLength(len){
    const total = yearLengths[2028];
    const eps = 1;
    const p1 = roadPath.getPointAtLength(Math.max(0, len - eps));
    const p2 = roadPath.getPointAtLength(Math.min(total, len + eps));
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }

  function placeRocketAt(len){
    const pt = roadPath.getPointAtLength(len);
    const angle = angleAtLength(len);
    // rocket art points "up" by default (−90°), so add 90° to align its nose with the direction of travel
    rocket.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle + 90})`);
    // the year tag rides along with it, staying upright and tucked just above the nose
    rocketTag.setAttribute('transform', `translate(${pt.x},${pt.y - 34})`);
  }

  function easeInOutQuad(t){ return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

  function animateRocketTo(targetLen){
    if(animFrame) cancelAnimationFrame(animFrame);
    const startLen = currentLen;
    const distance = targetLen - startLen;
    const duration = 900;
    const startTime = performance.now();
    function step(now){
      const t = Math.min(1, (now - startTime) / duration);
      placeRocketAt(startLen + distance * easeInOutQuad(t));
      if(t < 1){
        animFrame = requestAnimationFrame(step);
      } else {
        currentLen = targetLen;
      }
    }
    animFrame = requestAnimationFrame(step);
  }

  const revealRocket = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        rocket.classList.add('visible');
        rocketTag.classList.add('visible');
        revealRocket.unobserve(road);
      }
    });
  }, { threshold: 0.25 });
  revealRocket.observe(road);

  /* Fireworks — celebrate when the rocket reaches 2028 */
  const svgNS = 'http://www.w3.org/2000/svg';
  const fireworksGroup = document.getElementById('fireworks');
  const burstCenters = [[210,66],[340,44],[430,118],[150,108],[280,90]];
  const burstColors = ['var(--sunflower)', 'var(--rocket-red)', 'var(--clay)', '#8FCDEA', '#ffffff'];

  function spawnBurst(cx, cy){
    const sparkCount = 10;
    for(let i = 0; i < sparkCount; i++){
      const angle = (Math.PI * 2 / sparkCount) * i + Math.random() * 0.3;
      const radius = 24 + Math.random() * 16;
      const spark = document.createElementNS(svgNS, 'circle');
      spark.setAttribute('cx', cx);
      spark.setAttribute('cy', cy);
      spark.setAttribute('r', 2.4);
      spark.setAttribute('class', 'spark');
      spark.style.setProperty('--tx', (Math.cos(angle) * radius) + 'px');
      spark.style.setProperty('--ty', (Math.sin(angle) * radius) + 'px');
      spark.style.fill = burstColors[i % burstColors.length];
      spark.style.animationDelay = (Math.random() * 0.15) + 's';
      fireworksGroup.appendChild(spark);
    }
  }

  function triggerFireworks(){
    fireworksGroup.innerHTML = '';
    burstCenters.forEach((c, idx) => {
      setTimeout(() => spawnBurst(c[0], c[1]), idx * 160);
    });
  }

  let fireworksInterval = null;
  function startFireworksLoop(){
    stopFireworksLoop();
    triggerFireworks();
    fireworksInterval = setInterval(triggerFireworks, 1500);
  }
  function stopFireworksLoop(){
    if(fireworksInterval){
      clearInterval(fireworksInterval);
      fireworksInterval = null;
    }
    fireworksGroup.innerHTML = '';
  }

  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', () => selectYear(btn.dataset.year, true));
  });

  function selectYear(year, animate){
    const btn = document.querySelector('.year-btn[data-year="' + year + '"]');

    document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.milestone').forEach(m => m.classList.remove('active-milestone'));
    document.getElementById('m' + year).classList.add('active-milestone');

    rocketTag.querySelector('text').textContent = year;

    if(animate){
      animateRocketTo(yearLengths[year]);
    } else {
      currentLen = yearLengths[year];
      placeRocketAt(currentLen);
    }

    stopFireworksLoop();
    if(year === '2028'){
      setTimeout(startFireworksLoop, animate ? 950 : 0);
    }
  }

  // land the rocket on today's real year when the page opens, clamped to the years on the road
  const availableYears = [2025, 2026, 2027, 2028];
  const todayYear = new Date().getFullYear();
  const startYear = String(Math.min(Math.max(todayYear, availableYears[0]), availableYears[availableYears.length - 1]));
  selectYear(startYear, false);

  /* Scoreboard: achieved / target inputs recalc the percentage live */
  function updateScoreTile(tile){
    const numInput = tile.querySelector('.num-input');
    const denInput = tile.querySelector('.den-input');
    let num = parseFloat(numInput.value);
    let den = parseFloat(denInput.value);
    if(isNaN(num) || num < 0){ num = 0; }
    if(isNaN(den) || den < 0){ den = 0; }
    const pct = den > 0 ? Math.round((num / den) * 100) : 0;
    tile.querySelector('.pct').textContent = pct + '%';
    tile.querySelector('.bar-fill').style.width = Math.min(pct, 100) + '%';
  }
  document.querySelectorAll('.score-tile').forEach(tile => {
    tile.querySelectorAll('input[type="number"]').forEach(inp => {
      inp.addEventListener('input', () => updateScoreTile(tile));
    });
  });
  /* Monthly document galleries — In-Action photos & ORP scorecards */
  function wireMonthGallery(tabsId, imgId, imageMap, defaultMonth){
    const tabs = document.getElementById(tabsId);
    const img = document.getElementById(imgId);
    if(!tabs || !img) return;
    img.src = imageMap[defaultMonth];
    tabs.querySelectorAll('.month-btn').forEach(btn => {
      if(btn.dataset.month === defaultMonth) btn.classList.add('active');
      btn.addEventListener('click', () => {
        tabs.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        img.src = imageMap[btn.dataset.month];
      });
    });
  }

  const actionImages = {
    feb: 'assets/feb_action.jpg',
    mar: 'assets/mar_action.jpg',
    apr: 'assets/apr_action.jpg',
    may: 'assets/may_action.jpg',
    jun: 'assets/jun_action.jpg',
    jul: 'assets/jul_action.jpg',
    aug: 'assets/aug_action.jpg'
  };
  const orpImages = {
    feb: 'assets/feb_orp.jpg',
    mar: 'assets/mar_orp.jpg',
    apr: 'assets/apr_orp.jpg',
    may: 'assets/may_orp.jpg',
    jun: 'assets/jun_orp.jpg',
    jul: 'assets/jul_orp.jpg',
    aug: 'assets/aug_orp.jpg'
  };
  wireMonthGallery('actionTabs', 'actionImage', actionImages, 'aug');
  wireMonthGallery('orpTabs', 'orpImage', orpImages, 'aug');
