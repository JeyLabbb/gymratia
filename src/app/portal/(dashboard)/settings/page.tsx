'use client'

export default function PortalSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="font-heading text-2xl font-bold text-[#F8FAFC] mb-6">Ajustes del Portal</h1>
      <div className="rounded-xl bg-[#14161B] border border-[rgba(255,255,255,0.08)] p-6 max-w-lg">
        <p className="text-[#A7AFBE] text-sm">
          Las credenciales de acceso se configuran mediante variables de entorno:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-[#7B8291] font-mono">
          <li>ADMIN_EMAIL</li>
          <li>ADMIN_PASSWORD</li>
          <li>ADMIN_SESSION_SECRET (mín. 32 caracteres)</li>
        </ul>
        <p className="mt-4 text-[#A7AFBE] text-sm">
          Configúralas en .env.local (local) y en Vercel Environment Variables (producción).
        </p>
      </div>
    </div>
  )
}
