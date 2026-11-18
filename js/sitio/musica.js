/*
 * Musica: solo suena un fragmento a la vez y se indica cual.
 */
(function (Sitio) {
  'use strict';

  var T = Sitio.T;

  /* Texto del titulo sin el aviso oculto «(se abre en una pestaña nueva)» de su enlace. */
  function tituloVisible(titulo) {
    var copia = titulo.cloneNode(true);
    copia.querySelectorAll('.oculto').forEach(function (n) { n.remove(); });
    return copia.textContent.trim();
  }

  function iniciar() {
    /* ---------------------------------------------------------------
       Musica: solo suena un fragmento a la vez y se indica cual
       --------------------------------------------------------------- */
    var audios = document.querySelectorAll('main audio');
    audios.forEach(function (audio) {
      var articulo = audio.closest('article');
      audio.addEventListener('play', function () {
        audios.forEach(function (otro) {
          if (otro !== audio) { otro.pause(); }
        });
        if (articulo) {
          articulo.setAttribute('data-sonando', 'true');
          var artista = articulo.querySelector('p');
          Sitio.avisos.avisar(T.sonando((artista ? artista.textContent + ' — ' : '') + tituloVisible(articulo.querySelector('h3'))));
        }
      });
      ['pause', 'ended'].forEach(function (tipo) {
        audio.addEventListener(tipo, function () {
          if (articulo) { articulo.removeAttribute('data-sonando'); }
        });
      });
    });
  }

  Sitio.musica = { iniciar: iniciar };
}(window.Sitio = window.Sitio || {}));
