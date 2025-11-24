import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'

function AdminLoginForm() {
  const { t } = useTranslation()
  const { session, authLoading, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  if (authLoading) {
    return <p className="admin-help-text">{t('auth.checking_session')}</p>
  }

  if (session) {
    return (
      <div className="admin-login-state">
        <p className="admin-help-text">
          {t('auth.signed_in_as')} <strong>{session.user?.email}</strong>
        </p>
        <button type="button" className="ghost-button" onClick={() => signOut()}>
          {t('auth.sign_out')}
        </button>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setStatus(t('auth.signing_in'))
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setStatus(null)
    } else {
      setStatus(t('auth.signed_in_redirecting'))
      setEmail('')
      setPassword('')
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label>
        {t('auth.email')}
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
        />
      </label>
      <label>
        {t('auth.password')}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
        />
      </label>
      <button type="submit">{t('auth.sign_in')}</button>
      {status && <p className="admin-help-text">{status}</p>}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export default AdminLoginForm
