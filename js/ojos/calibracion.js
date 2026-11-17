/*
 * Seguimiento de ojos: calibracion con nueve puntos que el usuario pulsa mirandolos.
 */
(function (Ojos) {
  'use strict';

  var T = Ojos.T;
  var crear = Ojos.crear;
  var PULSACIONES = Ojos.config.PULSACIONES;

  /* ================== CALIBRACION ================== */
  function calibrar() {
    /* Capa de calibracion: un dialog abierto que cubre la pagina, con el aviso en una seccion. */
    var capa = crear('dialog', { 'data-ojos': 'capa', open: '', 'aria-modal': 'true', 'aria-labelledby': 'ojos-titulo' });
    var aviso = crear('section', { 'data-ojos': 'aviso' });
    var titulo = crear('h2', { id: 'ojos-titulo' }, T.titulo);
    var texto = crear('p', { 'aria-live': 'polite' }, T.cargando);
    aviso.append(titulo, texto);
    capa.appendChild(aviso);
    document.body.appendChild(capa);

    var webgazer = null;

    Ojos.registro.cargarLibreria()
      .then(function (wg) {
        webgazer = wg;
        return wg.clearData ? Promise.resolve(wg.clearData()).catch(function () {}) : null;
      })
      .then(function () { return Ojos.registro.arrancar(webgazer, true); })
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
        Ojos.registro.empezar();
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

  Ojos.calibracion = { iniciar: calibrar };
}(window.Ojos = window.Ojos || {}));
