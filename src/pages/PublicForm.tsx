import { ClipboardList } from 'lucide-react'

/** Phase 2: the public form (form builder output, captcha, uploads). */
export default function PublicForm() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-300 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lift">
        <ClipboardList className="mx-auto h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-lg font-semibold">Formulário em construção</h1>
        <p className="mt-1 text-sm text-slate-500">Formulario en construcción · Phase 2</p>
      </div>
    </div>
  )
}
