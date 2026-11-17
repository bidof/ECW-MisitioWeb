/*
 * Seguimiento de ojos: registro de la mirada, carga de WebGazer y control de la camara.
 */
(function (Ojos) {
  'use strict';

  var CLAVE_DATOS = Ojos.config.CLAVE_DATOS;
  var CLAVE_ESTADO = Ojos.config.CLAVE_ESTADO;
  var LIB = Ojos.config.LIB;
  var MODELO = Ojos.config.MODELO;
  var INTERVALO = Ojos.config.INTERVALO;
  var pagina = Ojos.pagina;
  var leer = Ojos.leer;
  var escribir = Ojos.escribir;
  var crear = Ojos.crear;

  var datos = null;
  var registro = null;
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
    escribir(CLAVE_ESTADO, 'grabando');
  }

  function alMirar(dato) {
    if (!grabando || !dato) { return; }
    var ahora = Date.now();
    if (ahora - ultimaMuestra < INTERVALO) { return; }
    if (dato.x < 0 || dato.y < 0 || dato.x > window.innerWidth || dato.y > window.innerHeight) { return; }
    ultimaMuestra = ahora;
    registro.puntos.push([Math.round(dato.x + window.scrollX), Math.round(dato.y + window.scrollY), ahora]);
  }

  /* Al salir de la pagina se guarda y se apaga la camara: si se deja
     encendida, el navegador tarda en soltarla y la pagina siguiente se queda
     cargando hasta que puede volver a usarla. */
  var camaraApagada = false;
  function apagarCamara() {
    if (camaraApagada) { return; }
    camaraApagada = true;
    try { if (window.webgazer) { window.webgazer.pause(); } } catch (e) { /* sin webgazer */ }
    Array.prototype.forEach.call(document.querySelectorAll('video'), function (video) {
      if (video.srcObject && video.srcObject.getTracks) {
        video.srcObject.getTracks().forEach(function (pista) { pista.stop(); });
      }
    });
  }
  function salir() { guardar(); apagarCamara(); }

  function cargarLibreria() {
    return new Promise(function (resolver, rechazar) {
      if (window.webgazer) { resolver(window.webgazer); return; }
      var script = crear('script', { src: LIB });
      script.onload = function () { resolver(window.webgazer); };
      script.onerror = rechazar;
      document.head.appendChild(script);
    });
  }

  /* Configura WebGazer y arranca la camara; en calibracion se ve la camara y la cara. */
  function arrancarWebgazer(webgazer, calibrando) {
    webgazer.params.faceMeshSolutionPath = MODELO;
    webgazer.params.saveDataAcrossSessions = true;
    webgazer.params.videoViewerWidth = 240;
    webgazer.params.videoViewerHeight = 180;
    return webgazer
      .setRegression('ridge')
      .setGazeListener(alMirar)
      .showVideoPreview(calibrando)
      .showFaceOverlay(calibrando)
      .showFaceFeedbackBox(calibrando)
      .showPredictionPoints(false)
      .begin();
  }

  /* Prepara el registro de la pagina actual y guarda los datos al salir de ella. */
  function preparar() {
    datos = leer(CLAVE_DATOS, {});
    registro = datos[pagina] || { ancho: window.innerWidth, puntos: [], tiempo: 0 };
    datos[pagina] = registro;
    window.setInterval(function () { if (grabando) { guardar(); } }, 2000);
    window.addEventListener('pagehide', salir);
    window.addEventListener('beforeunload', salir);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { guardar(); } });

    /* Enlaces internos: se apaga la camara antes de cambiar de pagina. */
    document.addEventListener('click', function (evento) {
      var enlace = evento.target.closest && evento.target.closest('a[href]');
      if (!enlace || enlace.target === '_blank' || evento.defaultPrevented) { return; }
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) { return; }
      var destino = new URL(enlace.href, window.location.href);
      if (destino.origin === window.location.origin && destino.pathname !== window.location.pathname) { salir(); }
    });
  }

  Ojos.registro = { preparar: preparar, empezar: empezarRegistro, cargarLibreria: cargarLibreria, arrancar: arrancarWebgazer };
}(window.Ojos = window.Ojos || {}));
