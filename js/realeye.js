/*
 * Integracion con RealEye (seguimiento de ojos con estudios "Embedded Website").
 * Solo se activa cuando la pagina se abre desde un estudio de RealEye
 * (dentro de su iframe o con el parametro stimulusId); para el resto de
 * visitantes no se descarga nada.
 *
 * Documentacion: https://www.realeye.io/support/embedded-website-tests-for-aggregated-results
 */
const SDK = 'https://app.realeye.io/sdk/js/testRunnerEmbeddableSdk-latest.js';
const parametros = new URLSearchParams(window.location.search);
const dentroDeRealEye = parametros.has('stimulusId') || window.self !== window.top;

/* Parametros propios del sitio que no son del estudio. */
const PROPIOS = ['q', 'asunto'];

function parametrosDelEstudio() {
  const actuales = new URLSearchParams(window.location.search);
  PROPIOS.forEach((clave) => actuales.delete(clave));
  return actuales;
}

/* Añade los parametros del estudio a un enlace interno para que RealEye
   siga registrando al usuario cuando cambia de pagina. */
function conParametrosDelEstudio(href) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin || !/(\.html|\/)$/.test(url.pathname)) { return href; }
  parametrosDelEstudio().forEach((valor, clave) => {
    if (!url.searchParams.has(clave)) { url.searchParams.set(clave, valor); }
  });
  return url.href;
}

if (dentroDeRealEye) {
  window.realEyeEnlace = conParametrosDelEstudio;

  /* Enlaces: se corrige la direccion justo antes de seguirlos. */
  document.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[href]');
    if (enlace) { enlace.href = conParametrosDelEstudio(enlace.href); }
  }, true);

  /* Formularios GET (buscador): los parametros viajan como campos ocultos. */
  document.addEventListener('submit', (evento) => {
    const formulario = evento.target;
    if ((formulario.getAttribute('method') || 'get').toLowerCase() !== 'get') { return; }
    parametrosDelEstudio().forEach((valor, clave) => {
      if (!formulario.querySelector('input[name="' + clave + '"]')) {
        const oculto = document.createElement('input');
        oculto.type = 'hidden';
        oculto.name = clave;
        oculto.value = valor;
        formulario.appendChild(oculto);
      }
    });
  }, true);

  /* El SDK se crea cuando la pagina ya esta cargada, como indica RealEye. */
  const iniciar = async () => {
    try {
      const { default: EmbeddedPageSdk } = await import(SDK);
      window.reSdk = new EmbeddedPageSdk(
        parametros.get('debug') === '1',
        parametros.get('stimulusId'),
        parametros.get('forceRun') === '1'
      );
    } catch (error) {
      console.warn('No se ha podido cargar el SDK de RealEye', error);
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
}
