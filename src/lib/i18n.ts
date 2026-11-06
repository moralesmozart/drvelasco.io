import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const ptBR = {
  app: { name: 'drvelasco', demo: 'Modo demo · dados ficam só neste navegador', resetDemo: 'Restaurar demo' },
  common: {
    cancel: 'Cancelar', save: 'Salvar', delete: 'Excluir', create: 'Criar', edit: 'Editar', close: 'Fechar',
    loading: 'Carregando…', error: 'Algo deu errado', back: 'Voltar', search: 'Procurar cards',
    saved: 'Salvo', confirm: 'Confirmar',
  },
  auth: {
    title: 'Bem-vindo de volta', subtitle: 'Entre para ver as solicitações dos seus pacientes.',
    heroTitle: 'Suas solicitações de saúde, organizadas e prontas.',
    heroSubtitle: 'Do formulário do paciente ao documento final, cada etapa num só lugar.',
    heroPoint1: 'Dados protegidos', heroPoint2: 'Formulários para pacientes', heroPoint3: 'Documentos em um clique',
    statusNew: 'Nova', statusReview: 'Em análise', statusReady: 'Pronta',
    secure: 'Conexão segura · acesso apenas para a equipe',
    email: 'E-mail', password: 'Senha', submit: 'Entrar', invalid: 'E-mail ou senha incorretos.',
    notAdmin: 'Sua conta não tem acesso a este espaço.', logout: 'Sair', demoEnter: 'Entrar no modo demo',
  },
  home: {
    greeting: 'Olá, {{name}}', subtitle: 'Seus pipes', newPipe: 'Criar pipe', cards_one: '{{count}} card',
    cards_other: '{{count}} cards', empty: 'Nenhum pipe ainda. Crie o primeiro!',
    pipeName: 'Nome do pipe', color: 'Cor', icon: 'Ícone',
    deletePipe: 'Excluir pipe', deletePipeTitle: 'Excluir "{{name}}"?',
    deletePipeBody: 'Todas as fases, campos e {{count}} cards serão excluídos para sempre. Digite o nome do pipe para confirmar.',
  },
  board: {
    addPhase: 'Nova fase', phaseName: 'Nome da fase', phaseColor: 'Cor', phaseDescription: 'Descrição (opcional)',
    isFinal: 'Fase final', isFinalHint: 'Cards aqui contam como concluídos.',
    editPhase: 'Editar fase', moveLeft: 'Mover para a esquerda', moveRight: 'Mover para a direita',
    deletePhase: 'Excluir fase', deletePhaseTitle: 'Excluir a fase "{{name}}"?',
    deletePhaseEmpty: 'Esta fase está vazia. Esta ação não pode ser desfeita.',
    deletePhaseWithCards_one: 'Esta fase tem {{count}} card. Escolha para onde ele vai antes de excluir.',
    deletePhaseWithCards_other: 'Esta fase tem {{count}} cards. Escolha para onde eles vão antes de excluir.',
    moveCardsTo: 'Mover cards para', lastPhase: 'Um pipe precisa de pelo menos uma fase.',
    emptyFirst: 'Aqui chegam os cards criados para este pipe.', emptyOther: 'Arraste cards para cá',
    forms: 'Formulários', newCard: 'Novo card', cardTitle: 'Título do card', publicForm: 'Formulário público',
    copyLink: 'Copiar link', linkCopied: 'Link copiado!',
    moveBlocked: 'Movimento não permitido: de "{{from}}" só é possível ir para {{to}}.',
    moved: 'Card movido para "{{to}}"', inPhaseFor: '{{time}} nesta fase', final: 'Final',
    openCardSoon: 'O detalhe completo do card chega na próxima etapa.',
    viaForm: 'Via formulário',
  },
  forms: {
    selectPlaceholder: 'Selecione…', chooseFiles: 'Escolher arquivos', fileHint: 'Imagens ou PDF · até 10 MB cada · arraste aqui',
    tooManyFiles: 'Máximo de 10 arquivos.', fileTooBig: '"{{name}}" passa de 10 MB.', uploadFailed: 'Não foi possível enviar "{{name}}".',
    errRequired: 'Campo obrigatório', errEmail: 'E-mail inválido', errPhone: 'Telefone inválido',
    fixErrors_one: 'Revise {{count}} campo destacado.', fixErrors_other: 'Revise os {{count}} campos destacados.',
    submit: 'Enviar', sendFailed: 'Não foi possível enviar agora. Tente novamente em instantes.',
    sentTitle: 'Enviado!', sentDefault: 'Recebemos suas informações.', sendAnother: 'Enviar outra resposta',
    privacy: 'Seus dados são usados apenas para este atendimento.',
    notFound: 'Formulário não encontrado', notFoundHint: 'Verifique o link recebido.',
    readMore: 'Ler mais', readLess: 'Ler menos',
    step1: 'Preencha o formulário de pré-consulta', step2: 'A equipe médica avalia suas informações', step3: 'Entramos em contato com você',
    confidential: 'Suas informações de saúde são confidenciais.',
  },
  builder: {
    title: 'Formulários', startForm: 'Formulário inicial', startFormHint: 'Público: qualquer pessoa com o link cria um card.',
    phaseFormHint: 'Campos preenchidos pela equipe nesta fase.',
    addField: 'Adicionar campo', fieldTypes: 'Tipos de campo', empty: 'Nenhum campo ainda. Escolha um tipo à esquerda.',
    label: 'Pergunta', description: 'Texto de ajuda (opcional)', required: 'Obrigatório', showOnCard: 'Mostrar no card',
    showOnCardHint: 'Aparece na visão do kanban (máx. 3).', options: 'Opções', addOption: 'Adicionar opção', optionPlaceholder: 'Nova opção…',
    conditions: 'Lógica condicional', conditionsHint: 'Mostrar este campo apenas quando…', addCondition: 'Adicionar condição',
    whenField: 'Campo', op_equals: 'é igual a', op_contains: 'contém', op_filled: 'está preenchido', value: 'Valor',
    noConditionFields: 'Adicione campos antes deste para criar condições.',
    deleteField: 'Excluir campo', deleteFieldTitle: 'Excluir "{{name}}"?', deleteFieldBody: 'Respostas já salvas neste campo deixam de aparecer. Esta ação não pode ser desfeita.',
    duplicate: 'Duplicar', selectField: 'Selecione um campo para editar.',
    settings: 'Aparência do formulário', formTitle: 'Título', formDescription: 'Descrição', bgColor: 'Cor de fundo',
    logoKicker: 'Logo: texto pequeno (opcional)', logoName: 'Logo: nome', logoHint: 'Aparece como logotipo animado no topo do formulário.', successMessage: 'Mensagem de sucesso', submitLabel: 'Texto do botão', preview: 'Abrir formulário', saving: 'Salvando…', conditional: 'Condicional',
    newFieldLabel: 'Nova pergunta',
  },
  card: {
    history: 'Histórico', currentPhase: 'Fase atual', noPhaseFields: 'Esta fase não tem campos. Adicione em Formulários.',
    moveTo: 'Mover card para', fillRequired: 'Preencha antes de mover:', created: 'Criado', updated: 'Atualizado',
    delete: 'Excluir card', deleteTitle: 'Excluir "{{name}}"?', deleteBody: 'O card e todo o seu histórico serão excluídos. Esta ação não pode ser desfeita.',
    deleted: 'Card excluído', noHistory: 'Sem histórico ainda.', evCreated: 'Card criado', evCreatedForm: 'Card criado pelo formulário público',
    evMoved: 'Movido de', evTitle: 'Título alterado', removedField: 'Campo removido',
    dragMissing: 'Preencha os campos obrigatórios antes de mover: {{fields}}', fileDemo: 'No modo demo os arquivos não são guardados.',
  },
  types: {
    short_text: 'Texto curto', long_text: 'Texto longo', email: 'E-mail', phone: 'Telefone', date: 'Data', number: 'Número',
    currency: 'Moeda', radio: 'Escolha única', checklist: 'Múltipla escolha', select: 'Lista suspensa', attachment: 'Anexo', info: 'Texto informativo',
  },
}

type Dict = typeof ptBR

const es: Dict = {
  app: { name: 'drvelasco', demo: 'Modo demo · los datos quedan solo en este navegador', resetDemo: 'Restaurar demo' },
  common: {
    cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', create: 'Crear', edit: 'Editar', close: 'Cerrar',
    loading: 'Cargando…', error: 'Algo salió mal', back: 'Volver', search: 'Buscar tarjetas',
    saved: 'Guardado', confirm: 'Confirmar',
  },
  auth: {
    title: 'Bienvenido de nuevo', subtitle: 'Entra para ver las solicitudes de tus pacientes.',
    heroTitle: 'Tus solicitudes de salud, organizadas y listas.',
    heroSubtitle: 'Del formulario del paciente al documento final, cada paso en un solo lugar.',
    heroPoint1: 'Datos protegidos', heroPoint2: 'Formularios para pacientes', heroPoint3: 'Documentos en un clic',
    statusNew: 'Nueva', statusReview: 'En revisión', statusReady: 'Lista',
    secure: 'Conexión segura · acceso solo para el equipo',
    email: 'Correo', password: 'Contraseña', submit: 'Entrar', invalid: 'Correo o contraseña incorrectos.',
    notAdmin: 'Tu cuenta no tiene acceso a este espacio.', logout: 'Salir', demoEnter: 'Entrar en modo demo',
  },
  home: {
    greeting: 'Hola, {{name}}', subtitle: 'Tus pipes', newPipe: 'Crear pipe', cards_one: '{{count}} tarjeta',
    cards_other: '{{count}} tarjetas', empty: 'Aún no hay pipes. ¡Crea el primero!',
    pipeName: 'Nombre del pipe', color: 'Color', icon: 'Icono',
    deletePipe: 'Eliminar pipe', deletePipeTitle: '¿Eliminar "{{name}}"?',
    deletePipeBody: 'Todas las fases, campos y {{count}} tarjetas se eliminarán para siempre. Escribe el nombre del pipe para confirmar.',
  },
  board: {
    addPhase: 'Nueva fase', phaseName: 'Nombre de la fase', phaseColor: 'Color', phaseDescription: 'Descripción (opcional)',
    isFinal: 'Fase final', isFinalHint: 'Las tarjetas aquí cuentan como terminadas.',
    editPhase: 'Editar fase', moveLeft: 'Mover a la izquierda', moveRight: 'Mover a la derecha',
    deletePhase: 'Eliminar fase', deletePhaseTitle: '¿Eliminar la fase "{{name}}"?',
    deletePhaseEmpty: 'Esta fase está vacía. Esta acción no se puede deshacer.',
    deletePhaseWithCards_one: 'Esta fase tiene {{count}} tarjeta. Elige a dónde va antes de eliminar.',
    deletePhaseWithCards_other: 'Esta fase tiene {{count}} tarjetas. Elige a dónde van antes de eliminar.',
    moveCardsTo: 'Mover tarjetas a', lastPhase: 'Un pipe necesita al menos una fase.',
    emptyFirst: 'Aquí llegan las tarjetas creadas para este pipe.', emptyOther: 'Arrastra tarjetas aquí',
    forms: 'Formularios', newCard: 'Nueva tarjeta', cardTitle: 'Título de la tarjeta', publicForm: 'Formulario público',
    copyLink: 'Copiar enlace', linkCopied: '¡Enlace copiado!',
    moveBlocked: 'Movimiento no permitido: desde "{{from}}" solo se puede ir a {{to}}.',
    moved: 'Tarjeta movida a "{{to}}"', inPhaseFor: '{{time}} en esta fase', final: 'Final',
    openCardSoon: 'El detalle completo de la tarjeta llega en la próxima etapa.',
    viaForm: 'Vía formulario',
  },
  forms: {
    selectPlaceholder: 'Selecciona…', chooseFiles: 'Elegir archivos', fileHint: 'Imágenes o PDF · hasta 10 MB cada uno · arrastra aquí',
    tooManyFiles: 'Máximo 10 archivos.', fileTooBig: '"{{name}}" supera los 10 MB.', uploadFailed: 'No se pudo subir "{{name}}".',
    errRequired: 'Campo obligatorio', errEmail: 'Correo inválido', errPhone: 'Teléfono inválido',
    fixErrors_one: 'Revisa {{count}} campo marcado.', fixErrors_other: 'Revisa los {{count}} campos marcados.',
    submit: 'Enviar', sendFailed: 'No se pudo enviar ahora. Inténtalo de nuevo en unos instantes.',
    sentTitle: '¡Enviado!', sentDefault: 'Hemos recibido tu información.', sendAnother: 'Enviar otra respuesta',
    privacy: 'Tus datos se usan solo para esta atención.',
    notFound: 'Formulario no encontrado', notFoundHint: 'Revisa el enlace recibido.',
    readMore: 'Leer más', readLess: 'Leer menos',
    step1: 'Rellena el formulario de preconsulta', step2: 'El equipo médico evalúa tu información', step3: 'Nos ponemos en contacto contigo',
    confidential: 'Tu información de salud es confidencial.',
  },
  builder: {
    title: 'Formularios', startForm: 'Formulario inicial', startFormHint: 'Público: cualquiera con el enlace crea una tarjeta.',
    phaseFormHint: 'Campos que rellena el equipo en esta fase.',
    addField: 'Añadir campo', fieldTypes: 'Tipos de campo', empty: 'Aún no hay campos. Elige un tipo a la izquierda.',
    label: 'Pregunta', description: 'Texto de ayuda (opcional)', required: 'Obligatorio', showOnCard: 'Mostrar en la tarjeta',
    showOnCardHint: 'Aparece en la vista kanban (máx. 3).', options: 'Opciones', addOption: 'Añadir opción', optionPlaceholder: 'Nueva opción…',
    conditions: 'Lógica condicional', conditionsHint: 'Mostrar este campo solo cuando…', addCondition: 'Añadir condición',
    whenField: 'Campo', op_equals: 'es igual a', op_contains: 'contiene', op_filled: 'está rellenado', value: 'Valor',
    noConditionFields: 'Añade campos antes de este para crear condiciones.',
    deleteField: 'Eliminar campo', deleteFieldTitle: '¿Eliminar "{{name}}"?', deleteFieldBody: 'Las respuestas guardadas en este campo dejarán de mostrarse. Esta acción no se puede deshacer.',
    duplicate: 'Duplicar', selectField: 'Selecciona un campo para editarlo.',
    settings: 'Apariencia del formulario', formTitle: 'Título', formDescription: 'Descripción', bgColor: 'Color de fondo',
    logoKicker: 'Logo: texto pequeño (opcional)', logoName: 'Logo: nombre', logoHint: 'Aparece como logotipo animado arriba del formulario.', successMessage: 'Mensaje de éxito', submitLabel: 'Texto del botón', preview: 'Abrir formulario', saving: 'Guardando…', conditional: 'Condicional',
    newFieldLabel: 'Nueva pregunta',
  },
  card: {
    history: 'Historial', currentPhase: 'Fase actual', noPhaseFields: 'Esta fase no tiene campos. Añádelos en Formularios.',
    moveTo: 'Mover tarjeta a', fillRequired: 'Rellena antes de mover:', created: 'Creada', updated: 'Actualizada',
    delete: 'Eliminar tarjeta', deleteTitle: '¿Eliminar "{{name}}"?', deleteBody: 'La tarjeta y todo su historial se eliminarán. Esta acción no se puede deshacer.',
    deleted: 'Tarjeta eliminada', noHistory: 'Aún no hay historial.', evCreated: 'Tarjeta creada', evCreatedForm: 'Tarjeta creada por el formulario público',
    evMoved: 'Movida de', evTitle: 'Título cambiado', removedField: 'Campo eliminado',
    dragMissing: 'Rellena los campos obligatorios antes de mover: {{fields}}', fileDemo: 'En modo demo los archivos no se guardan.',
  },
  types: {
    short_text: 'Texto corto', long_text: 'Texto largo', email: 'Correo', phone: 'Teléfono', date: 'Fecha', number: 'Número',
    currency: 'Moneda', radio: 'Opción única', checklist: 'Opción múltiple', select: 'Lista desplegable', attachment: 'Adjunto', info: 'Texto informativo',
  },
}

export const LANGS = [
  { code: 'pt-BR', label: 'PT' },
  { code: 'es', label: 'ES' },
] as const

function initialLang() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved) return saved
  } catch { /* ignore */ }
  return navigator.language.startsWith('es') ? 'es' : 'pt-BR'
}

i18n.use(initReactI18next).init({
  resources: { 'pt-BR': { translation: ptBR }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('lang', lng) } catch { /* ignore */ }
  document.documentElement.lang = lng
})

export default i18n
