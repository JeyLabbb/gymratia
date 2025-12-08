'use client'

import { useState } from 'react'

export default function OnboardingExpert() {
  const [v, setV] = useState({ bodyfat: '', waist: '', chest: '', hip: '', notes: '' })
  function go() {
    window.location.href = '/trainers'
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Modo experto</h1>
      <p className="mt-2 text-slate-600">Añade medidas para un ajuste más fino.</p>
      <div className="mt-6 grid gap-4">
        <input
          className="border rounded-[1.25rem] px-4 py-3"
          placeholder="% grasa (opcional)"
          onChange={(e) => setV((x) => ({ ...x, bodyfat: e.target.value }))}
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            className="border rounded-[1.25rem] px-4 py-3"
            placeholder="Cintura (cm)"
            onChange={(e) => setV((x) => ({ ...x, waist: e.target.value }))}
          />
          <input
            className="border rounded-[1.25rem] px-4 py-3"
            placeholder="Pecho (cm)"
            onChange={(e) => setV((x) => ({ ...x, chest: e.target.value }))}
          />
          <input
            className="border rounded-[1.25rem] px-4 py-3"
            placeholder="Cadera (cm)"
            onChange={(e) => setV((x) => ({ ...x, hip: e.target.value }))}
          />
        </div>
        <textarea
          className="border rounded-[1.25rem] px-4 py-3"
          placeholder="Notas (lesiones, sueño…)"
          onChange={(e) => setV((x) => ({ ...x, notes: e.target.value }))}
        />
        <button onClick={go} className="rounded-[1.25rem] bg-[#007AFF] text-white px-6 py-3">
          Continuar
        </button>
      </div>
      <div className="mt-6 text-center text-sm text-slate-500">
        ¿Básico?{' '}
        <a className="text-[#007AFF]" href="/onboarding/basic">
          Volver
        </a>
      </div>
    </div>
  )
}







