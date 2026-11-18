/*
 * Contacto: boton para copiar el correo y formulario con validacion en linea.
 */
(function (Sitio) {
  'use strict';

  var T = Sitio.T;

  function iniciar() {
    /* ---------------------------------------------------------------
       Copiar el correo al portapapeles
       --------------------------------------------------------------- */
    document.querySelectorAll('button[data-copiar]').forEach(function (boton) {
      boton.hidden = false;
      boton.addEventListener('click', function () {
        var texto = boton.getAttribute('data-copiar');
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(texto).then(function () {
            Sitio.avisos.avisar(T.copiado);
          }, function () {
            Sitio.avisos.avisar(T.copiarError);
          });
        } else {
          Sitio.avisos.avisar(T.copiarError);
        }
      });
    });

    /* ---------------------------------------------------------------
       Formulario de contacto con validacion en linea
       --------------------------------------------------------------- */
    var formulario = document.querySelector('main form[action^="mailto:"]');
    if (formulario) {
      formulario.noValidate = true;
      var correoDestino = formulario.getAttribute('action').replace('mailto:', '');
      var estado = formulario.querySelector('[role="status"]');
      var campos = {
        nombre: formulario.querySelector('#nombre'),
        correo: formulario.querySelector('#correo'),
        asunto: formulario.querySelector('#asunto'),
        mensaje: formulario.querySelector('#mensaje')
      };
      var contador = formulario.querySelector('#contador-mensaje');
      var MINIMO_MENSAJE = 20;

      /* El asunto se puede elegir desde la URL, por ejemplo ?asunto=referencias */
      var asuntoUrl = new URLSearchParams(window.location.search).get('asunto');
      if (asuntoUrl && campos.asunto.querySelector('option[value="' + asuntoUrl.replace(/[^a-z-]/g, '') + '"]')) {
        campos.asunto.value = asuntoUrl;
      }

      var errorDe = function (nombre) {
        var campo = campos[nombre];
        var valor = campo.value.trim();
        var E = T.errores;
        if (nombre === 'nombre') {
          if (!valor) { return E.nombre; }
          if (valor.length < 2) { return E.nombreCorto; }
        } else if (nombre === 'correo') {
          if (!valor) { return E.correo; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) { return E.correoFormato; }
        } else if (nombre === 'asunto') {
          if (!valor) { return E.asunto; }
        } else if (nombre === 'mensaje') {
          if (!valor) { return E.mensaje; }
          if (valor.length < MINIMO_MENSAJE) { return E.mensajeCorto(MINIMO_MENSAJE - valor.length); }
        }
        return '';
      };

      var comprobar = function (nombre) {
        var campo = campos[nombre];
        var error = errorDe(nombre);
        document.getElementById('error-' + nombre).textContent = error;
        campo.setAttribute('aria-invalid', String(Boolean(error)));
        return !error;
      };

      Object.keys(campos).forEach(function (nombre) {
        var campo = campos[nombre];
        campo.addEventListener('blur', function () {
          if (campo.value.trim() || campo.hasAttribute('aria-invalid')) { comprobar(nombre); }
        });
        campo.addEventListener(nombre === 'asunto' ? 'change' : 'input', function () {
          if (campo.hasAttribute('aria-invalid')) { comprobar(nombre); }
        });
      });

      var actualizarContador = function () {
        contador.textContent = String(campos.mensaje.value.length);
      };
      campos.mensaje.addEventListener('input', actualizarContador);
      actualizarContador();

      formulario.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var invalidos = Object.keys(campos).filter(function (nombre) { return !comprobar(nombre); });
        if (invalidos.length) {
          estado.setAttribute('data-tipo', 'error');
          estado.textContent = T.revisa(invalidos.length);
          campos[invalidos[0]].focus();
          return;
        }
        var nombre = campos.nombre.value.trim();
        var asuntoTexto = campos.asunto.options[campos.asunto.selectedIndex].text;
        var enlace = 'mailto:' + correoDestino +
          '?subject=' + encodeURIComponent('[' + T.asuntoCorreo + '] ' + asuntoTexto + ' · ' + nombre) +
          '&body=' + encodeURIComponent(T.cuerpo(nombre, campos.correo.value.trim(), campos.mensaje.value.trim()));
        estado.setAttribute('data-tipo', 'exito');
        estado.textContent = T.enviado(nombre, correoDestino);
        Sitio.avisos.avisar(T.avisoEnviado);
        window.location.href = enlace;
      });
    }
  }

  Sitio.contacto = { iniciar: iniciar };
}(window.Sitio = window.Sitio || {}));
