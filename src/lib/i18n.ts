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
    title: 'Entrar', subtitle: 'Acesse seus pipes e acompanhe cada solicitação.',
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
    newCard: 'Novo card', cardTitle: 'Título do card', publicForm: 'Formulário público',
    copyLink: 'Copiar link', linkCopied: 'Link copiado!',
    moveBlocked: 'Movimento não permitido: de "{{from}}" só é possível ir para {{to}}.',
    moved: 'Card movido para "{{to}}"', inPhaseFor: 'há {{time}} nesta fase', final: 'Final',
    openCardSoon: 'O detalhe completo do card chega na próxima etapa.',
    viaForm: 'Via formulário',
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
    title: 'Entrar', subtitle: 'Accede a tus pipes y sigue cada solicitud.',
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
    newCard: 'Nueva tarjeta', cardTitle: 'Título de la tarjeta', publicForm: 'Formulario público',
    copyLink: 'Copiar enlace', linkCopied: '¡Enlace copiado!',
    moveBlocked: 'Movimiento no permitido: desde "{{from}}" solo se puede ir a {{to}}.',
    moved: 'Tarjeta movida a "{{to}}"', inPhaseFor: 'hace {{time}} en esta fase', final: 'Final',
    openCardSoon: 'El detalle completo de la tarjeta llega en la próxima etapa.',
    viaForm: 'Vía formulario',
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
