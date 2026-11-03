from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

OUT = Path('docs/Manual configuracion Google Calendar y OAuth.docx')
OUT.parent.mkdir(parents=True, exist_ok=True)
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.72); sec.bottom_margin = Inches(.72)
sec.left_margin = Inches(.82); sec.right_margin = Inches(.82)

styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(9.5); styles['Normal'].font.color.rgb = RGBColor(35, 42, 52)
styles['Normal'].paragraph_format.space_after = Pt(5)
for name, size in [('Title', 25), ('Heading 1', 16), ('Heading 2', 12)]:
    s = styles[name]; s.font.name = 'Aptos Display'; s.font.size = Pt(size); s.font.bold = True; s.font.color.rgb = RGBColor(0,0,0)
    s.paragraph_format.space_before = Pt(10); s.paragraph_format.space_after = Pt(5)

def shade(cell, fill):
    pr = cell._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), fill); pr.append(shd)
def set_cell_text(cell, text, bold=False, color=None, size=8.5):
    cell.text = ''
    p = cell.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
    r = p.add_run(text); r.bold = bold; r.font.name = 'Aptos'; r.font.size = Pt(size)
    if color: r.font.color.rgb = RGBColor(*color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers)); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.style = 'Table Grid'
    for i,h in enumerate(headers): set_cell_text(t.rows[0].cells[i],h,True,(255,255,255)); shade(t.rows[0].cells[i],'244FC7')
    trPr = t.rows[0]._tr.get_or_add_trPr(); rep = OxmlElement('w:tblHeader'); rep.set(qn('w:val'),'true'); trPr.append(rep)
    for row in rows:
        cells=t.add_row().cells
        for i,val in enumerate(row):
            set_cell_text(cells[i],str(val))
            if len(t.rows)%2==0: shade(cells[i],'F1F5FA')
    doc.add_paragraph().paragraph_format.space_after=Pt(1)
    return t
def bullet(text): doc.add_paragraph(text, style='List Bullet')
def numbered(text): doc.add_paragraph(text, style='List Number')

p=doc.add_paragraph(); p.style='Title'; p.add_run('Manual de Google Calendar y OAuth')
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(14)
r=p.add_run('Configuración, permisos y evolución de la integración en Gestión MD'); r.font.size=Pt(12); r.font.color.rgb=RGBColor(85,98,116)
doc.add_paragraph('Este manual explica cómo preparar Google Cloud para conectar Google Calendar con Gestión MD, qué permisos se solicitarán, cómo funciona la lectura de eventos y qué pasos quedan para ampliar la integración. La conexión OAuth de Google y el almacenamiento cifrado del refresh token ya están implementados. La consulta y sincronización de eventos de Google todavía están pendientes; el calendario actual muestra eventos locales.')

doc.add_heading('1. Alcance acordado', level=1)
doc.add_paragraph('La primera integración será de solo lectura. Cada usuario conectará sus propias cuentas; el calendario y los eventos serán privados para ese usuario. La cuenta de origen se asociará a una empresa y una cuenta destino única podrá centralizar copias informativas en una fase posterior. Las reuniones no invitarán a los contactos externos: sus datos se incluirán en la descripción cuando se implemente la centralización.')
table(['Etapa','Qué incluirá','Estado'],[
('Base actual','Vistas agenda, semana y mes; eventos locales; registro manual de cuentas y configuración por empresa.','Implementado en la aplicación'),
('Conexión Google','OAuth, verificación de correo y almacenamiento cifrado del refresh token.','Implementado; requiere variables de entorno'),
('Google lectura','Consulta de eventos y sincronización con la aplicación.','Pendiente de implementación'),
('Centralización','Copia del evento en cuenta destino, sin asistentes, y mantenimiento de cambios/cancelaciones.','Futuro'),
('Automatización','Sincronización incremental y notificaciones de cambios.','Futuro')])

doc.add_heading('2. Conceptos de Google Cloud', level=1)
doc.add_paragraph('Google Cloud aloja la configuración del proyecto técnico, habilita Calendar API y emite las credenciales OAuth que identifican a Gestión MD. OAuth es el mecanismo por el que cada usuario autoriza a la aplicación a consultar su calendario sin entregarle su contraseña. El consentimiento se presenta al conectar cada cuenta.')
table(['Término','Significado'],[
('Proyecto de Google Cloud','Contenedor de APIs, credenciales, consentimiento OAuth y cuotas.'),
('Google Calendar API','Servicio que permite consultar eventos con autorización.'),
('Cliente OAuth web','Identificador de la aplicación y secreto usado por el servidor en el intercambio OAuth.'),
('Origen autorizado','Dominio desde el que el navegador puede iniciar solicitudes OAuth; incluye protocolo y puerto, sin ruta.'),
('URI de redireccionamiento','Ruta exacta de la aplicación a la que Google devuelve al usuario tras autorizar.'),
('Scope o alcance','Permiso concreto solicitado por la aplicación.')])

doc.add_heading('3. Crear y preparar el proyecto Cloud', level=1)
for x in [
 'En Google Cloud Console, crea un proyecto para Gestión MD o selecciona el proyecto ya creado. Conserva el acceso administrativo de forma segura.',
 'En APIs & Services → Library, busca Google Calendar API y pulsa Enable.',
 'Abre Google Auth Platform. En Branding define el nombre visible de la aplicación, correo de soporte y datos de contacto.',
 'En Audience elige Internal solo si todas las cuentas conectadas pertenecen a una misma organización de Google Workspace. Si habrá Gmail personal o usuarios de distintas organizaciones, elige External.',
 'Durante desarrollo, si la audiencia es External y la publicación está en Testing, agrega las cuentas Google que probarán como Test users.',
 'En Data Access agrega únicamente el alcance de lectura descrito en la sección siguiente y guarda.'
]: numbered(x)
doc.add_paragraph('Google puede pedir habilitar facturación en la cuenta Cloud. La API ofrece uso estándar sin costo adicional dentro de las cuotas vigentes; revisa el panel de cuotas y facturación antes de habilitar servicios ajenos a Calendar o solicitar aumentos. Google anunció que el exceso de cuota estándar podría facturarse más adelante en 2026.')

doc.add_heading('4. Permiso mínimo para leer eventos', level=1)
doc.add_paragraph('La aplicación solicita el scope de Calendar indicado abajo. También solicita openid y email para identificar y mostrar el correo verificado de la cuenta conectada; estos dos alcances no amplían el acceso al calendario.')
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=p.add_run('https://www.googleapis.com/auth/calendar.events.readonly'); r.bold=True; r.font.name='Consolas'; r.font.size=Pt(9)
doc.add_paragraph('Este alcance permite leer los eventos de calendarios a los que el usuario ya puede acceder. No autoriza crear, editar, compartir ni eliminar eventos. Google clasifica ciertos alcances de Calendar como sensibles, por lo que la publicación externa puede requerir verificación OAuth. En pruebas, una aplicación externa en estado Testing tiene límites de testers y sus autorizaciones de scopes de Calendar pueden expirar a los siete días.')
doc.add_paragraph('No agregues calendar, calendar.events ni permisos de escritura para la fase de lectura. Si más adelante necesitamos listar calendarios secundarios para que el usuario elija uno, evaluaremos calendar.calendarlist.readonly y lo solicitaremos solo cuando esa función exista.')

doc.add_heading('5. Cliente OAuth y direcciones', level=1)
doc.add_paragraph('Crea o edita un cliente OAuth de tipo Web application en Google Auth Platform → Clients. El callback implementado es /api/calendar/google/callback. Registra direcciones exactas:')
table(['Entorno','Origen autorizado','URI de redireccionamiento'],[
('Desarrollo local','http://localhost:3000','http://localhost:3000/api/calendar/google/callback'),
('Producción','https://<dominio-de-la-app>','https://<dominio-de-la-app>/api/calendar/google/callback')])
doc.add_paragraph('El dominio de producción puede ser un subdominio HTTPS del proveedor de hosting; no es obligatorio comprar un dominio propio para empezar. La URI debe coincidir exactamente con el callback implementado, incluidos protocolo, host, puerto y ruta. Para desarrollo local se usa http://localhost:3000/api/calendar/google/callback.')
doc.add_paragraph('El origen es solo protocolo + host + puerto. La URI de redirección incluye la ruta callback. No son intercambiables. Configura GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET y GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY en el servidor. GOOGLE_CALENDAR_REDIRECT_URI es opcional si se deriva de BETTER_AUTH_URL; si se define, debe ser idéntica a la URI registrada en Google Cloud. Genera la clave de cifrado con 32 bytes aleatorios codificados en Base64. No guardes estas variables en Git, en código del navegador ni en capturas compartidas.')

doc.add_heading('6. Flujo de conexión previsto', level=1)
for x in [
 'Desde Perfil → Configuración de calendario, el usuario elige Conectar Google.',
 'El servidor genera una solicitud OAuth con state aleatorio validado en cookie HttpOnly, el scope mínimo de lectura y acceso offline para renovar la sesión sin pedir autorización en cada visita.',
 'Google muestra la cuenta y el consentimiento. El usuario acepta o cancela.',
 'Google retorna un código al callback HTTPS; el servidor lo intercambia por tokens y verifica la identidad/correo de la cuenta.',
 'El sistema cifra el refresh token con AES-256-GCM y lo guarda en la base de datos, junto con la cuenta conectada, estado, alcance y expiración del access token. Nunca se devuelve el token al navegador ni se registra en logs.',
 'La conexión queda vinculada al usuario autenticado. La consulta de eventos y su asociación a una empresa se implementarán en el siguiente paso.',
 'La pantalla muestra si la cuenta está conectada. La última sincronización y la reconexión/desconexión se completarán al desarrollar la lectura de eventos.'
]: numbered(x)

doc.add_heading('7. Lectura y sincronización', level=1)
doc.add_paragraph('La primera carga consulta eventos de la ventana necesaria para mostrar la agenda. Las siguientes sincronizaciones deben usar el token incremental nextSyncToken de Google para pedir solo cambios, en vez de descargar repetidamente todo el calendario. Si Google responde que el token venció, se limpia el cursor y se repite una carga completa. Los eventos cancelados deben reflejarse en la copia local.')
doc.add_paragraph('Para la versión inicial puede existir un botón Sincronizar ahora. Luego puede agregarse una tarea programada. Las notificaciones push son una optimización futura: requieren endpoint público HTTPS, renovación de canales y una consulta posterior a Google porque el webhook avisa que hubo cambios pero no entrega el evento completo.')

doc.add_heading('8. Datos y privacidad en Gestión MD', level=1)
doc.add_paragraph('El diseño actual contempla cuentas por usuario, una cuenta destino por usuario, asociaciones por empresa y eventos privados por usuario/empresa. La integración deberá guardar identificadores externos del evento y del calendario, estado de sincronización, última modificación y cursor incremental. Se debe limitar la lectura a las cuentas autorizadas por el mismo usuario y aplicar los permisos del módulo calendario.')
bullet('Los calendarios de un usuario no serán visibles para otros usuarios.')
bullet('La cuenta centralizada mostrará los eventos propios del usuario en las empresas donde este habilite la vista.')
bullet('La centralización futura creará un evento personal en la cuenta destino, sin añadir como asistentes a los contactos de la reunión.')
bullet('Los tokens de actualización requieren cifrado en reposo, control de acceso del servidor, exclusión de logs y eliminación al desconectar la cuenta.')

doc.add_heading('9. Funciones futuras y cómo ampliar permisos', level=1)
table(['Función futura','Cambio posible','Permiso a evaluar'],[
('Elegir entre calendarios del usuario','Listar calendarios accesibles y guardar calendarId elegido.','calendar.calendarlist.readonly'),
('Copiar eventos a la cuenta central','Crear eventos espejo en cuenta destino; guardar IDs origen/destino y evitar duplicados.','calendar.events.owned o calendar.events'),
('Actualizar o cancelar copias','Sincronizar ediciones y cancelaciones del evento origen con la copia.','Permiso de escritura adecuado al calendario destino'),
('Ver disponibilidad sin detalles','Consultar bloques libres/ocupados para evitar cruces.','calendar.events.freebusy'),
('Avisos casi en tiempo real','Configurar webhook y renovar canales de notificación.','El scope de lectura existente, más infraestructura HTTPS')])
doc.add_paragraph('Cada ampliación debe pasar por esta secuencia: definir la función; confirmar qué datos necesita; seleccionar el scope mínimo; actualizar Data Access y el código OAuth; mostrar una explicación al usuario antes de solicitar consentimiento; manejar rechazo y revocación; probar; actualizar aviso de privacidad y enviar a verificación si Google lo exige. No se deben pedir permisos “por si acaso”.')

doc.add_heading('10. Lista de comprobación', level=1)
table(['Verificación','Resultado esperado'],[
('Proyecto Cloud creado','Proyecto correcto seleccionado en consola.'),
('Calendar API habilitada','La API aparece como Enabled.'),
('Consentimiento configurado','Marca, audiencia y contacto definidos.'),
('Scope de lectura agregado','calendar.events.readonly, sin permisos de escritura.'),
('Tester agregado','La cuenta Google de pruebas está permitida si audiencia External/Testing.'),
('Cliente web OAuth','Creado cuando el callback real esté listo.'),
('URLs registradas','Origen y URI de redirección exactos para local y producción.'),
('Secretos seguros','Client secret y refresh tokens solo en backend/cifrado.'),
('Publicación/verificación','Revisar requisitos antes de habilitar usuarios externos.')])

doc.add_heading('11. Referencias oficiales', level=1)
for label,url in [
 ('Scopes de Google Calendar API','https://developers.google.com/workspace/calendar/api/auth'),
 ('Configurar consentimiento OAuth','https://developers.google.com/workspace/guides/configure-oauth-consent'),
 ('Crear credenciales OAuth','https://developers.google.com/workspace/guides/create-credentials'),
 ('OAuth para aplicaciones web','https://developers.google.com/identity/protocols/oauth2/web-server'),
 ('Consultar eventos y sincronización incremental','https://developers.google.com/workspace/calendar/api/v3/reference/events/list'),
 ('Cuotas de Google Calendar API','https://developers.google.com/workspace/calendar/api/guides/quota'),
 ('Notificaciones push','https://developers.google.com/workspace/calendar/api/guides/push')]:
    p=doc.add_paragraph(style='List Bullet'); p.add_run(label + ': ' + url)

doc.core_properties.title='Manual de Google Calendar y OAuth'
doc.core_properties.subject='Configuración de Google Cloud, OAuth y calendario para Gestión MD'
doc.core_properties.author='Gestión MD'
doc.save(OUT)
print(OUT.resolve())
