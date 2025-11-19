import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function AdminLoginForm() {
  const { session, authLoading, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  if (authLoading) {
    return <p className="admin-help-text">Checking session …</p>
  }

  if (session) {
    return (
      <div className="admin-login-state">
        <p className="admin-help-text">
          Signed in as <strong>{session.user?.email}</strong>
        </p>
        <button type="button" className="ghost-button" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setStatus('Signing in …')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setStatus(null)
    } else {
      setStatus('Signed in! Redirecting …')
      setEmail('')
      setPassword('')
    }
  }

  return (
    <form className="admin-login-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
        />
      </label>
      <button type="submit">Sign in</button>
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
