/*
 * Aviso emergente (toast) con region viva para lectores de pantalla.
 */
(function (Sitio) {
  'use strict';

  var crear = Sitio.crear;

  /* output es el elemento semantico para un resultado o mensaje de estado. */
  var aviso = null;
  var temporizadorAviso;

  function crearAviso() {
    aviso = crear('output', { role: 'status', 'aria-live': 'polite', 'data-visible': 'false' });
    document.body.appendChild(aviso);
  }

  /* WCAG 2.2.3 (AAA): el aviso no desaparece por tiempo. Se queda hasta que el usuario
     hace otra cosa (pulsar, tocar o usar el teclado), asi tiene todo el tiempo para leerlo. */
  function ocultarAviso() {
    aviso.setAttribute('data-visible', 'false');
  }

  function avisar(mensaje) {
    window.clearTimeout(temporizadorAviso);
    aviso.textContent = mensaje;
    aviso.setAttribute('data-visible', 'true');
    /* Se espera un momento para que el mismo clic que lo muestra no lo cierre. */
    temporizadorAviso = window.setTimeout(function () {
      document.addEventListener('pointerdown', ocultarAviso, { once: true });
      document.addEventListener('keydown', ocultarAviso, { once: true });
    }, 300);
  }

  Sitio.avisos = { iniciar: crearAviso, avisar: avisar };
}(window.Sitio = window.Sitio || {}));
