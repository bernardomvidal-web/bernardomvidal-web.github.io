// Excertos do YouTube com legendas próprias (WebVTT), carregados só depois do clique.
(function () {
  function tempo(t) {
    var p = t.trim().split(":").map(parseFloat);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }
  function lerVTT(txt) {
    var cues = [];
    txt.replace(/\r/g, "").split(/\n\n+/).forEach(function (bloco) {
      var l = bloco.split("\n");
      var i = l.findIndex(function (x) { return x.indexOf("-->") > -1; });
      if (i < 0) return;
      var tt = l[i].split("-->");
      cues.push({ a: tempo(tt[0]), b: tempo(tt[1].split(" ")[1] || tt[1]), t: l.slice(i + 1).join("\n") });
    });
    return cues;
  }
  var api = null;
  function carregarAPI(cb) {
    if (window.YT && window.YT.Player) return cb();
    if (api) return api.push(cb);
    api = [cb];
    window.onYouTubeIframeAPIReady = function () { api.forEach(function (f) { f(); }); };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }
  document.querySelectorAll(".yt").forEach(function (caixa) {
    var botao = caixa.querySelector(".yt-play");
    function semCC(e) {
      try { e.target.unloadModule("captions"); e.target.unloadModule("cc"); } catch (_) { /* sem módulo */ }
    }
    botao.addEventListener("click", function () {
      var alvo = document.createElement("div");
      var leg = document.createElement("div");
      leg.className = "legenda";
      leg.setAttribute("aria-live", "polite");
      // legendas gravadas na imagem original: uma faixa opaca tapa-as e recebe as nossas
      if (caixa.dataset.tapar) {
        leg.classList.add("tapa");
        leg.style.setProperty("--tapar", caixa.dataset.tapar + "%");
      }
      caixa.innerHTML = "";
      caixa.appendChild(alvo);
      caixa.appendChild(leg);
      var inicio = parseInt(caixa.dataset.inicio || "0", 10);
      var fim = caixa.dataset.fim ? parseInt(caixa.dataset.fim, 10) : undefined;
      var cues = [];
      if (caixa.dataset.vtt) {
        fetch(caixa.dataset.vtt).then(function (r) { return r.text(); }).then(function (t) { cues = lerVTT(t); });
      }
      carregarAPI(function () {
        var p = new YT.Player(alvo, {
          host: "https://www.youtube-nocookie.com",
          videoId: caixa.dataset.id,
          playerVars: Object.assign({ start: inicio, end: fim, autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
            caixa.dataset.cc ? { cc_load_policy: 1, cc_lang_pref: 'pt', hl: 'pt' } : { iv_load_policy: 3 }),
          // com legendas próprias, desligar as do YouTube para não se sobreporem
          events: caixa.dataset.vtt ? { onReady: semCC, onApiChange: semCC, onStateChange: semCC } : {},
        });
        setInterval(function () {
          if (!p || !p.getCurrentTime || !cues.length) return;
          var t = p.getCurrentTime();
          var c = cues.find(function (c) { return t >= c.a && t <= c.b; });
          leg.textContent = c ? c.t : "";
        }, 200);
      });
    });
  });
})();
