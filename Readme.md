SITIO WEB PERSONAL
==================

TECNOLOGIAS
-----------

HTML5
Se utiliza para estructurar las paginas con elementos semanticos y
accesibles. El sitio tiene nueve paginas en espanol (inicio, sobre mi, viajes,
musica, formacion, contacto, ayuda, mapa del sitio y buscador), sus nueve
equivalentes en ingles dentro de la carpeta en/ y una pagina 404 bilingue. Sus elementos nativos permiten incorporar imagenes adaptables,
audio y video sin instalar complementos.

CSS
Se utiliza para definir la presentacion y adaptar la distribucion del
contenido a pantallas de escritorio y moviles. Las hojas de estilo estan
separadas por pagina y comparten reglas generales.

JAVASCRIPT
Se utiliza como mejora progresiva: sin JavaScript todo el contenido y la
navegacion siguen funcionando. Aporta el buscador interno con sugerencias,
el menu plegable en movil, avisos emergentes de confirmacion,
el boton para volver arriba, la validacion en linea del formulario de contacto
y el control de los audios (solo suena uno a la vez y se marca el activo).
No se usan bibliotecas: toda la logica esta en js/main.js.

El buscador no usa un indice escrito a mano: cuando el usuario va a buscar,
recorre el sitio empezando por la portada y el mapa del sitio, descarga cada
fichero HTML con fetch(), lo analiza con DOMParser y sigue sus enlaces
internos. De cada pagina indexa el texto de <main>, con una entrada por pagina
y otra por cada seccion, articulo o titulo con id, para enlazar directamente
con su ancla. Busca sin distinguir tildes ni mayusculas, resalta las
coincidencias, muestra un fragmento del texto y sugiere correcciones si hay
erratas. El indice se guarda en sessionStorage y se regenera cuando cambia la
fecha de ultima actualizacion del pie. Necesita servirse desde un servidor web
(GitHub Pages o uno local): abierto como archivo, el navegador bloquea fetch().

PRUEBAS DE USABILIDAD (solo rama tanda2)
Microsoft Clarity registra los clics, toques y grabaciones de cada sesion.
El seguimiento de ojos esta en js/ojos.js y usa la biblioteca WebGazer.js
(Universidad de Brown), que estima la mirada con la webcam. Solo se activa a
peticion del evaluador; los visitantes normales no descargan nada:
  ?ojos=1    calibra (9 puntos, 5 pulsaciones cada uno) y empieza a registrar.
             El registro continua al cambiar de pagina en la misma pestana.
  ?ojos=ver  termina el registro y dibuja sobre la pagina el mapa de calor
             o el recorrido de la mirada (fijaciones numeradas); permite
             descargar todos los datos en JSON.
  ?ojos=0    termina el registro sin mostrar nada.
Los puntos se guardan en sessionStorage, en coordenadas de la pagina, y no
se envian a ningun servidor.

CARACTERISTICAS MODERNAS DE CSS
-------------------------------

Se usan variables CSS para centralizar colores y espaciados, Grid y Flexbox para
la maquetacion, el anidamiento (nesting) para agrupar las reglas de cada
componente y una consulta de contenedor (@container) en la portada para que las
tarjetas se adapten al ancho real del contenido. Todo es CSS estandar, sin
preprocesadores ni dependencias.

IMAGENES RESPONSIVE
-------------------

La fotografia personal utiliza el elemento picture para elegir entre cuatro
archivos segun el ancho de pantalla: img_movil.jpeg, img_tablet.jpeg,
img_portatil.jpeg e img_escritorio.jpeg. Cada imagen se muestra a su tamaño
intrinseco; los atributos width y height reservan espacio durante la carga.

Las fotografias de Japon se sirven desde Unsplash, un servicio externo de
alojamiento de imagenes. Los parametros w y h solicitan el ancho y el alto en
pixeles; picture selecciona una variante segun el ancho de pantalla. Se
incluyen las dimensiones en el HTML para reservar espacio durante la carga.

El CSS no escala las imagenes. El video conserva max-width: 100% y height: auto
para ajustarse a la pantalla sin perder su proporcion. Su poster es
imagen/kyoto_poster.jpeg.

HERRAMIENTAS Y DEPENDENCIAS
---------------------------

El sitio no utiliza bibliotecas JavaScript ni frameworks; todo el
JavaScript es propio. Se prefieren las
funciones nativas del navegador para reducir dependencias y facilitar el
desarrollo.

Google Fonts sirve la familia tipografica Roboto. Se incluyen fuentes
alternativas del sistema para que el texto siga siendo legible si el servicio
no esta disponible. Unsplash aporta las fotografias de Japon y requiere
conexion a Internet para cargarlas.

CONTENIDO
--------------------------------

El sitio consta de las paginas de inicio, sobre mi, viajes, musica, formacion
y contacto, mas las paginas de apoyo de ayuda, mapa del sitio y buscador.
Incluye datos personales, fotografia personal, aficiones agrupadas,
fotografias de viajes, un video, varios audios de canciones, formulario de
contacto, enlace a GitHub y referencias bajo peticion.

USABILIDAD Y AYUDA
------------------

- Migas de pan en todas las paginas interiores y mapa del sitio.
- Pagina de ayuda con atajos de teclado, preguntas frecuentes e historial de
  cambios.
- Fecha de la ultima actualizacion en el pie de todas las paginas. Al publicar
  cambios hay que actualizarla en las 19 paginas y en el historial de ayuda.
- Version completa en ingles: el enlace EN/ES de la cabecera abre la misma
  pagina en el otro idioma.

VALIDACION
----------

Todas las paginas pasan el validador HTML del W3C sin errores ni avisos. Las
hojas de estilo pasan el validador CSS del W3C salvo container-name,
container-type y @container, que son CSS estandar que el validador todavia no
reconoce.

Los audios de musica.html son fragmentos breves (de unos 15 a 60 segundos) de
cada cancion, comprimidos para reducir el peso del sitio. Cada tarjeta lo
indica con la palabra "Fragmento" seguida del nombre de la cancion.
