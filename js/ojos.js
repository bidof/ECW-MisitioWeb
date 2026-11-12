/*
 * Seguimiento de ojos para las pruebas de usabilidad (WebGazer.js).
 *
 * Solo se activa a peticion del evaluador; el resto de visitantes no
 * descarga nada ni ve ningun cambio.
 *
 *   ?ojos=1    calibra la camara y empieza a registrar la mirada.
 *              El registro sigue activo al cambiar de pagina (misma pestaña).
 *   ?ojos=ver  termina el registro y muestra sobre la pagina el mapa de
 *              calor y el recorrido de la mirada que se registro en ella.
 *   ?ojos=0    termina el registro sin mostrar nada.
 *
 * Los puntos de mirada se guardan en sessionStorage (solo en ese navegador),
 * en coordenadas de la pagina, y se pueden descargar en JSON.
 * Libreria: https://webgazer.cs.brown.edu (Universidad de Brown, licencia GPLv3).
 */
(function () {
  'use strict';

  var VERSION_LIB = '3.5.3';
  var LIB = 'https://cdn.jsdelivr.net/npm/webgazer@' + VERSION_LIB + '/dist/webgazer.js';
  var MODELO = 'https://cdn.jsdelivr.net/npm/webgazer@' + VERSION_LIB + '/dist/mediapipe/face_mesh';
  var CLAVE_ESTADO = 'ojos-estado';
  var CLAVE_DATOS = 'ojos-datos';
  var PULSACIONES = 5;
  var INTERVALO = 100; /* ms entre muestras guardadas */

  var INGLES = document.documentElement.lang === 'en';
  var T = INGLES ? {
    cargando: 'Starting the camera…',
    errorCamara: 'The camera could not be started. Allow camera access and reload the page.',
    titulo: 'Eye tracking calibration',
    instrucciones: 'Sit about an arm’s length from the screen, with your face inside the box. Look at each dot and click it ' + PULSACIONES + ' times without looking away. It turns green when done.',
    listo: 'Calibration finished. The red dot shows where the camera thinks you are looking: check that it follows your eyes.',
    empezar: 'Start the task',
    repetir: 'Calibrate again',
    punto: 'Calibration dot',
    panel: 'Gaze map of this page',
    muestras: function (n, s) { return n + ' gaze samples · ' + s + ' s on this page'; },
    vacio: 'No gaze data was recorded on this page.',
    otras: 'Other pages with data:',
    calor: 'Heat map',
    recorrido: 'Gaze path',
    descargar: 'Download data (JSON)',
    ocultar: 'Hide panel',
    mostrar: 'Gaze map',
    cerrar: 'Close',
    ancho: function (a) { return 'Recorded with a window ' + a + ' px wide; use the same width so the map matches the page.'; }
  } : {
    cargando: 'Iniciando la cámara…',
    errorCamara: 'No se ha podido iniciar la cámara. Permite el acceso a la cámara y recarga la página.',
    titulo: 'Calibración del seguimiento de ojos',
    instrucciones: 'Siéntate a un brazo de distancia de la pantalla, con la cara dentro del recuadro. Mira cada punto y púlsalo ' + PULSACIONES + ' veces sin dejar de mirarlo. Se pone verde al terminar.',
    listo: 'Calibración terminada. El punto rojo indica dónde cree la cámara que miras: comprueba que sigue a tus ojos.',
    empezar: 'Empezar la tarea',
    repetir: 'Volver a calibrar',
    punto: 'Punto de calibración',
    panel: 'Mapa de la mirada de esta página',
    muestras: function (n, s) { return n + ' muestras de mirada · ' + s + ' s en esta página'; },
    vacio: 'No se registró la mirada en esta página.',
    otras: 'Otras páginas con datos:',
    calor: 'Mapa de calor',
    recorrido: 'Recorrido',
    descargar: 'Descargar datos (JSON)',
    ocultar: 'Ocultar panel',
    mostrar: 'Mapa de la mirada',
    cerrar: 'Cerrar',
    ancho: function (a) { return 'Se registró con una ventana de ' + a + ' px de ancho; usa el mismo ancho para que el mapa coincida con la página.'; }
  };

  /* ---------- almacenamiento seguro ---------- */
  function leer(clave, porDefecto) {
    try {
      var valor = window.sessionStorage.getItem(clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch (e) { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { window.sessionStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  }
  function borrar(clave) {
    try { window.sessionStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
  }

  var pagina = window.location.pathname;
  var parametros = new URLSearchParams(window.location.search);
  var modo = parametros.get('ojos');
  var estado = leer(CLAVE_ESTADO, null);

  /* Se quita ?ojos de la direccion para que recargar no repita la accion. */
  if (modo !== null) {
    parametros.delete('ojos');
    var resto = parametros.toString();
    window.history.replaceState(null, '', pagina + (resto ? '?' + resto : '') + window.location.hash);
  }

  if (modo === '1') {
    borrar(CLAVE_DATOS);
    estado = 'calibrando';
    escribir(CLAVE_ESTADO, estado);
  } else if (modo === '0' || modo === 'ver') {
    estado = null;
    borrar(CLAVE_ESTADO);
  }

  if (!estado && modo !== 'ver') { return; }

  /* ---------- estilos (solo cuando la herramienta esta activa) ---------- */
  var estilos = document.createElement('style');
  estilos.textContent = [
    '[data-ojos="capa"]{position:fixed;inset:0;z-index:2147483000;background:rgb(255 255 255 / 0.94);color:#1c2222;font:16px/1.5 system-ui,sans-serif}',
    '[data-ojos="aviso"]{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:min(34rem,calc(100% - 7rem));text-align:center}',
    '[data-ojos="aviso"] h2{margin:0 0 .5rem;font-size:1.25rem}',
    '[data-ojos="aviso"] button{margin:.75rem .25rem 0;padding:.6rem 1.1rem;border:0;border-radius:.5rem;background:#1c5c4c;color:#fff;font:inherit;cursor:pointer}',
    '[data-ojos="aviso"] button+button{background:#5a6464}',
    '[data-ojos="punto"]{position:absolute;width:28px;height:28px;margin:-14px 0 0 -14px;padding:0;border:3px solid #fff;border-radius:50%;background:#c0392b;box-shadow:0 0 0 2px #c0392b;cursor:pointer}',
    '[data-ojos="punto"][disabled]{background:#2e9d6a;box-shadow:0 0 0 2px #2e9d6a;cursor:default}',
    '[data-ojos="lienzo"]{position:absolute;top:0;left:0;z-index:2147482000;pointer-events:none}',
    '[data-ojos="panel"]{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;width:min(22rem,calc(100% - 2rem));max-height:70vh;overflow:auto;padding:1rem;border-radius:.75rem;background:#fff;color:#1c2222;box-shadow:0 8px 30px rgb(0 0 0 / 0.25);font:14px/1.45 system-ui,sans-serif}',
    '[data-ojos="panel"] h2{margin:0 0 .4rem;font-size:1rem}',
    '[data-ojos="panel"] p{margin:.3rem 0}',
    '[data-ojos="panel"] a{color:#1c5c4c}',
    '[data-ojos="panel"] button{margin:.5rem .4rem 0 0;padding:.4rem .7rem;border:1px solid #1c5c4c;border-radius:.4rem;background:#fff;color:#1c5c4c;font:inherit;cursor:pointer}',
    '[data-ojos="panel"] button[aria-pressed="true"]{background:#1c5c4c;color:#fff}',
    '[data-ojos="mostrar"]{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;padding:.5rem .8rem;border:0;border-radius:.5rem;background:#1c5c4c;color:#fff;font:14px system-ui,sans-serif;cursor:pointer}',
    '#webgazerVideoContainer{z-index:2147483001!important}'
  ].join('');
  document.head.appendChild(estilos);

  function crear(etiqueta, atributos, texto) {
    var el = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (clave) { el.setAttribute(clave, atributos[clave]); });
    if (texto) { el.textContent = texto; }
    return el;
  }

  function cuandoCargue(fn) {
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); } else { fn(); }
  }

  if (modo === 'ver') {
    cuandoCargue(function () { window.addEventListener('load', mostrarMapa); if (document.readyState === 'complete') { mostrarMapa(); } });
    return;
  }

  /* ================== REGISTRO DE LA MIRADA ================== */
  var datos = leer(CLAVE_DATOS, {});
  var registro = datos[pagina] || { ancho: window.innerWidth, puntos: [], tiempo: 0 };
  datos[pagina] = registro;
  var grabando = false;
  var ultimaMuestra = 0;
  var inicioVisita = 0;

  function guardar() {
    if (grabando && inicioVisita) {
      registro.tiempo += Math.round((Date.now() - inicioVisita) / 1000);
      inicioVisita = Date.now();
    }
    escribir(CLAVE_DATOS, datos);
  }

  function empezarRegistro() {
    grabando = true;
    inicioVisita = Date.now();
    registro.ancho = window.innerWidth;
    estado = 'grabando';
    escribir(CLAVE_ESTADO, estado);
  }

  function alMirar(dato) {
    if (!grabando || !dato) { return; }
    var ahora = Date.now();
    if (ahora - ultimaMuestra < INTERVALO) { return; }
    if (dato.x < 0 || dato.y < 0 || dato.x > window.innerWidth || dato.y > window.innerHeight) { return; }
    ultimaMuestra = ahora;
    registro.puntos.push([Math.round(dato.x + window.scrollX), Math.round(dato.y + window.scrollY), ahora]);
  }

  window.setInterval(function () { if (grabando) { guardar(); } }, 2000);
  window.addEventListener('pagehide', guardar);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { guardar(); } });

  function cargarLibreria() {
    return new Promise(function (resolver, rechazar) {
      if (window.webgazer) { resolver(window.webgazer); return; }
      var script = crear('script', { src: LIB });
      script.onload = function () { resolver(window.webgazer); };
      script.onerror = rechazar;
      document.head.appendChild(script);
    });
  }

  function iniciar(webgazer, calibrando) {
    webgazer.params.faceMeshSolutionPath = MODELO;
    webgazer.params.saveDataAcrossSessions = true;
    return webgazer
      .setRegression('ridge')
      .setGazeListener(alMirar)
      .showVideoPreview(calibrando)
      .showFaceOverlay(calibrando)
      .showFaceFeedbackBox(calibrando)
      .showPredictionPoints(false)
      .begin();
  }

  cuandoCargue(function () {
    if (estado === 'grabando') {
      cargarLibreria()
        .then(function (webgazer) { return iniciar(webgazer, false); })
        .then(empezarRegistro)
        .catch(function (error) { console.warn('Seguimiento de ojos no disponible', error); });
      return;
    }
    calibrar();
  });

  /* ================== CALIBRACION ================== */
  function calibrar() {
    var capa = crear('div', { 'data-ojos': 'capa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ojos-titulo' });
    var aviso = crear('div', { 'data-ojos': 'aviso' });
    var titulo = crear('h2', { id: 'ojos-titulo' }, T.titulo);
    var texto = crear('p', { 'aria-live': 'polite' }, T.cargando);
    aviso.append(titulo, texto);
    capa.appendChild(aviso);
    document.body.appendChild(capa);

    var webgazer = null;

    cargarLibreria()
      .then(function (wg) {
        webgazer = wg;
        return wg.clearData ? Promise.resolve(wg.clearData()).catch(function () {}) : null;
      })
      .then(function () { return iniciar(webgazer, true); })
      .then(function () { texto.textContent = T.instrucciones; ponerPuntos(); })
      .catch(function (error) {
        console.warn(error);
        texto.textContent = T.errorCamara;
      });

    function ponerPuntos() {
      var posiciones = [8, 50, 92];
      var pendientes = 0;
      posiciones.forEach(function (y) {
        posiciones.forEach(function (x) {
          var punto = crear('button', { type: 'button', 'data-ojos': 'punto', 'aria-label': T.punto });
          punto.style.left = x + '%';
          punto.style.top = y + '%';
          var veces = 0;
          pendientes += 1;
          punto.addEventListener('click', function () {
            veces += 1;
            punto.style.opacity = String(1 - veces * 0.12);
            if (veces >= PULSACIONES) {
              punto.disabled = true;
              punto.style.opacity = '1';
              pendientes -= 1;
              if (pendientes === 0) { terminar(); }
            }
          });
          capa.appendChild(punto);
        });
      });
    }

    function terminar() {
      Array.prototype.forEach.call(capa.querySelectorAll('[data-ojos="punto"]'), function (p) { p.remove(); });
      capa.style.background = 'rgb(255 255 255 / 0.6)';
      webgazer.showVideoPreview(false).showFaceOverlay(false).showFaceFeedbackBox(false).showPredictionPoints(true);
      texto.textContent = T.listo;
      var empezar = crear('button', { type: 'button' }, T.empezar);
      var repetir = crear('button', { type: 'button' }, T.repetir);
      aviso.append(empezar, repetir);
      empezar.focus();

      empezar.addEventListener('click', function () {
        webgazer.showPredictionPoints(false);
        capa.remove();
        empezarRegistro();
      });
      repetir.addEventListener('click', function () {
        empezar.remove();
        repetir.remove();
        capa.style.background = '';
        Promise.resolve(webgazer.clearData()).catch(function () {}).then(function () {
          webgazer.showPredictionPoints(false).showVideoPreview(true).showFaceOverlay(true).showFaceFeedbackBox(true);
          texto.textContent = T.instrucciones;
          ponerPuntos();
        });
      });
    }
  }

  /* ================== VISOR DEL MAPA ================== */
  function mostrarMapa() {
    if (document.querySelector('[data-ojos="panel"]')) { return; }
    var todos = leer(CLAVE_DATOS, {});
    var actual = todos[pagina];
    var puntos = actual ? actual.puntos : [];

    var alto = Math.min(document.documentElement.scrollHeight, 16000);
    var ancho = document.documentElement.scrollWidth;
    var lienzo = crear('canvas', { 'data-ojos': 'lienzo', width: String(ancho), height: String(alto), 'aria-hidden': 'true' });
    document.body.appendChild(lienzo);

    var panel = crear('section', { 'data-ojos': 'panel', 'aria-labelledby': 'ojos-panel' });
    panel.appendChild(crear('h2', { id: 'ojos-panel' }, T.panel));

    var botonCalor = crear('button', { type: 'button', 'aria-pressed': 'true' }, T.calor);
    var botonRecorrido = crear('button', { type: 'button', 'aria-pressed': 'false' }, T.recorrido);

    if (puntos.length) {
      panel.appendChild(crear('p', {}, T.muestras(puntos.length, actual.tiempo || 0)));
      if (Math.abs(actual.ancho - window.innerWidth) > 20) { panel.appendChild(crear('p', {}, T.ancho(actual.ancho))); }
      panel.append(botonCalor, botonRecorrido);
    } else {
      panel.appendChild(crear('p', {}, T.vacio));
    }

    var otras = Object.keys(todos).filter(function (p) { return p !== pagina && todos[p].puntos.length; });
    if (otras.length) {
      panel.appendChild(crear('p', {}, T.otras));
      var lista = crear('ul');
      otras.forEach(function (p) {
        var li = crear('li');
        li.appendChild(crear('a', { href: p + '?ojos=ver' }, p.split('/').slice(-2).join('/') + ' (' + todos[p].puntos.length + ')'));
        lista.appendChild(li);
      });
      panel.appendChild(lista);
    }

    var descargar = crear('button', { type: 'button' }, T.descargar);
    var ocultar = crear('button', { type: 'button' }, T.ocultar);
    var cerrar = crear('button', { type: 'button' }, T.cerrar);
    panel.append(descargar, ocultar, cerrar);
    document.body.appendChild(panel);

    var mostrar = crear('button', { type: 'button', 'data-ojos': 'mostrar', hidden: '' }, T.mostrar);
    document.body.appendChild(mostrar);

    function pintar(tipo) {
      botonCalor.setAttribute('aria-pressed', String(tipo === 'calor'));
      botonRecorrido.setAttribute('aria-pressed', String(tipo === 'recorrido'));
      var ctx = lienzo.getContext('2d');
      ctx.clearRect(0, 0, ancho, alto);
      if (tipo === 'calor') { pintarCalor(ctx, puntos, ancho, alto); } else { pintarRecorrido(ctx, puntos); }
    }

    botonCalor.addEventListener('click', function () { pintar('calor'); });
    botonRecorrido.addEventListener('click', function () { pintar('recorrido'); });
    descargar.addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
      var enlace = crear('a', { href: URL.createObjectURL(blob), download: 'mirada-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json' });
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    });
    ocultar.addEventListener('click', function () { panel.hidden = true; mostrar.hidden = false; });
    mostrar.addEventListener('click', function () { panel.hidden = false; mostrar.hidden = true; });
    cerrar.addEventListener('click', function () { panel.remove(); mostrar.remove(); lienzo.remove(); });

    if (puntos.length) { pintar('calor'); }
  }

  /* Mapa de calor: se acumula la densidad de miradas y se colorea de azul (poca) a rojo (mucha). */
  function pintarCalor(ctx, puntos, ancho, alto) {
    var radio = Math.max(30, Math.round(Math.min(window.innerWidth, 1400) / 30));
    var capa = document.createElement('canvas');
    capa.width = ancho;
    capa.height = alto;
    var c = capa.getContext('2d');
    puntos.forEach(function (p) {
      var g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], radio);
      g.addColorStop(0, 'rgba(0,0,0,0.1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(p[0] - radio, p[1] - radio, radio * 2, radio * 2);
    });
    var imagen = c.getImageData(0, 0, ancho, alto);
    var d = imagen.data;
    var maximo = 0;
    for (var i = 3; i < d.length; i += 4) { if (d[i] > maximo) { maximo = d[i]; } }
    if (!maximo) { return; }
    for (var j = 0; j < d.length; j += 4) {
      var a = d[j + 3];
      if (!a) { continue; }
      var v = a / maximo;
      var color = paleta(v);
      d[j] = color[0];
      d[j + 1] = color[1];
      d[j + 2] = color[2];
      d[j + 3] = Math.round(70 + v * 150);
    }
    ctx.putImageData(imagen, 0, 0);
  }

  function paleta(v) {
    var paradas = [[0, [40, 80, 255]], [0.35, [0, 200, 220]], [0.55, [40, 200, 60]], [0.75, [255, 220, 0]], [1, [230, 30, 30]]];
    for (var i = 1; i < paradas.length; i += 1) {
      if (v <= paradas[i][0]) {
        var a = paradas[i - 1];
        var b = paradas[i];
        var f = (v - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * f); });
      }
    }
    return paradas[paradas.length - 1][1];
  }

  /* Recorrido: las muestras seguidas y cercanas se agrupan en fijaciones
     (circulos numerados, mas grandes cuanto mas tiempo) unidas en orden. */
  function fijaciones(puntos) {
    var lista = [];
    var grupo = [];
    function cerrarGrupo() {
      if (grupo.length >= 2) {
        var x = 0;
        var y = 0;
        grupo.forEach(function (p) { x += p[0]; y += p[1]; });
        lista.push({ x: x / grupo.length, y: y / grupo.length, duracion: grupo[grupo.length - 1][2] - grupo[0][2] });
      }
      grupo = [];
    }
    puntos.forEach(function (p) {
      if (grupo.length) {
        var cx = 0;
        var cy = 0;
        grupo.forEach(function (q) { cx += q[0]; cy += q[1]; });
        cx /= grupo.length;
        cy /= grupo.length;
        var salto = p[2] - grupo[grupo.length - 1][2] > 1000;
        if (salto || Math.hypot(p[0] - cx, p[1] - cy) > 70) { cerrarGrupo(); }
      }
      grupo.push(p);
    });
    cerrarGrupo();
    return lista;
  }

  function pintarRecorrido(ctx, puntos) {
    var lista = fijaciones(puntos);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(28,92,76,0.8)';
    ctx.beginPath();
    lista.forEach(function (f, i) { if (i) { ctx.lineTo(f.x, f.y); } else { ctx.moveTo(f.x, f.y); } });
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px system-ui, sans-serif';
    lista.forEach(function (f, i) {
      var r = Math.min(40, 10 + f.duracion / 60);
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? 'rgba(46,157,106,0.75)' : 'rgba(230,80,30,0.6)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(String(i + 1), f.x, f.y);
    });
  }
}());
