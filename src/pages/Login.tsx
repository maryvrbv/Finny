import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="login">
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
          setBusy(false)
          if (error) setError(error.message === 'Invalid login credentials' ? 'Неверный логин или пароль' : error.message)
        }}
      >
        <h1>💰 Finny</h1>
        <p className="muted">Финансы Маши и Димы</p>
        <input type="email" placeholder="Логин (email)" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Пароль" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="warn small">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div>
  )
}
