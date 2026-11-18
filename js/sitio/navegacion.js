/*
 * Ayudas de navegacion: boton para volver arriba, aviso de los enlaces que
 * abren otra pestana, barra de carga al cambiar de pagina y atajos de teclado.
 */
(function (Sitio) {
  'use strict';

  var T = Sitio.T;
  var crear = Sitio.crear;
  var ICONO_ARRIBA = Sitio.ICONO_ARRIBA;

  function iniciar() {
    /* ---------------------------------------------------------------
       Boton para volver arriba
       --------------------------------------------------------------- */
    var botonArriba = crear('button', { type: 'button', 'aria-label': T.arriba, title: T.arriba });
    botonArriba.innerHTML = ICONO_ARRIBA;
    botonArriba.hidden = true;
    document.body.appendChild(botonArriba);

    botonArriba.addEventListener('click', function () {
      window.scrollTo({ top: 0 });
      var logo = document.querySelector('body > header > a');
      if (logo) { logo.focus({ preventScroll: true }); }
    });

    var pendienteScroll = false;
    window.addEventListener('scroll', function () {
      if (pendienteScroll) { return; }
      pendienteScroll = true;
      window.requestAnimationFrame(function () {
        botonArriba.hidden = window.scrollY < 600;
        pendienteScroll = false;
      });
    }, { passive: true });

    /* ---------------------------------------------------------------
       Enlaces externos: aviso de que se abren en otra pestaña
       --------------------------------------------------------------- */
    document.querySelectorAll('a[target="_blank"]').forEach(function (enlace) {
      if (!enlace.title) { enlace.title = T.nuevaPestana; }
    });

    /* Barra de carga al ir a otra pagina del sitio. */
    document.addEventListener('click', function (evento) {
      var enlace = evento.target.closest && evento.target.closest('a[href]');
      if (!enlace || evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey ||
        evento.shiftKey || evento.altKey || enlace.target === '_blank' || enlace.hasAttribute('download')) { return; }
      var destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || /^(mailto|tel):/.test(enlace.href)) { return; }
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) { return; }
      document.documentElement.setAttribute('data-cargando', '');
    });
    /* Al volver atras el navegador puede restaurar la pagina: se quita la barra. */
    window.addEventListener('pageshow', function () {
      document.documentElement.removeAttribute('data-cargando');
    });

    /* Atajo de teclado: «/» lleva al buscador y «Esc» cierra el menu. */
    document.addEventListener('keydown', function (evento) {
      var objetivo = evento.target;
      var escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo.tagName) || objetivo.isContentEditable;
      if (evento.key === '/' && !escribiendo && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
        var campo = document.querySelector('main form[role="search"] input') ||
          document.querySelector('body > header form[role="search"] input');
        if (campo) {
          evento.preventDefault();
          campo.focus();
          campo.select();
        }
      } else if (evento.key === 'Escape' && Sitio.menu.cerrar()) {
        Sitio.menu.boton().focus();
      }
    });
  }

  Sitio.navegacion = { iniciar: iniciar };
}(window.Sitio = window.Sitio || {}));
