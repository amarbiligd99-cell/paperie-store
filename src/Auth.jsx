
import { useState } from 'react'
import { supabase } from './supabase'
import './Auth.css'

function Auth({ onAuthenticated, onClose }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearMessages()

    if (!email.trim()) {
      setError('Имэйл хаягаа оруулна уу.')
      return
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('Нууц үг хамгийн багадаа 6 тэмдэгт байна.')
      return
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Нэрээ оруулна уу.')
        return
      }

      if (password !== confirmPassword) {
        setError('Нууц үг таарахгүй байна.')
        return
      }
    }

    setLoading(true)

    try {
      // НУУЦ ҮГ СЭРГЭЭХ
      if (mode === 'reset') {
        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo: window.location.origin
            }
          )

        if (error) throw error

        setMessage(
          'Нууц үг сэргээх холбоос таны имэйл рүү илгээгдлээ.'
        )
      }

      // ШИНЭ ХЭРЭГЛЭГЧ БҮРТГҮҮЛЭХ
      if (mode === 'register') {
        const { data, error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim()
              }
            }
          })

        if (error) throw error

        if (data.session && data.user) {
          onAuthenticated?.(data.user)
        } else {
          setMessage(
            'Бүртгэл амжилттай. Имэйл хаягаа шалгаж, бүртгэлээ баталгаажуулна уу.'
          )
        }
      }

      // НЭВТРЭХ
      if (mode === 'login') {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          })

        if (error) throw error

        if (data.user) {
          onAuthenticated?.(data.user)
        }
      }
    } catch (err) {
      console.error('Authentication error:', err)

      const errorMessages = {
        'Invalid login credentials':
          'Имэйл эсвэл нууц үг буруу байна.',
        'User already registered':
          'Энэ имэйлээр бүртгэл үүссэн байна.',
        'Email not confirmed':
          'Имэйл хаягаа эхлээд баталгаажуулна уу.',
        'Password should be at least 6 characters':
          'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.'
      }

      setError(
        errorMessages[err.message] ||
        err.message ||
        'Алдаа гарлаа. Дахин оролдоно уу.'
      )
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (newMode) => {
    setMode(newMode)
    clearMessages()
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">

        <button
          className="auth-close"
          onClick={onClose}
          type="button"
          aria-label="Хаах"
        >
          ×
        </button>

        <div className="auth-brand">
          paperie<span>.</span>
        </div>

        <p className="auth-subtitle">
          YOUR LITTLE HAPPY PLACE
        </p>

        <div className="auth-decoration">♡</div>

        {mode === 'login' && (
          <>
            <h2>Тавтай морил!</h2>
            <p className="auth-description">
              Paperie дэлгүүртээ дахин зочилсонд баярлалаа.
            </p>
          </>
        )}

        {mode === 'register' && (
          <>
            <h2>Бүртгэл үүсгэх ♡</h2>
            <p className="auth-description">
              Өөрийн Paperie бүртгэлийг үүсгээрэй.
            </p>
          </>
        )}

        {mode === 'reset' && (
          <>
            <h2>Нууц үг сэргээх</h2>
            <p className="auth-description">
              Бүртгэлтэй имэйл хаягаа оруулна уу.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit}>

          {mode === 'register' && (
            <div className="auth-field">
              <label>Таны нэр</label>
              <input
                type="text"
                placeholder="Нэрээ оруулна уу"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Имэйл хаяг</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="auth-field">
              <label>Нууц үг</label>
              <input
                type="password"
                placeholder="Нууц үгээ оруулна уу"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                minLength={6}
                required
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="auth-field">
              <label>Нууц үг давтах</label>
              <input
                type="password"
                placeholder="Нууц үгээ дахин оруулна уу"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="auth-forgot">
              <button
                type="button"
                onClick={() => changeMode('reset')}
              >
                Нууц үгээ мартсан уу?
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Түр хүлээнэ үү...'
              : mode === 'login'
                ? 'Нэвтрэх →'
                : mode === 'register'
                  ? 'Бүртгүүлэх →'
                  : 'Холбоос илгээх →'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="auth-switch">
            Бүртгэлгүй юу?
            <button onClick={() => changeMode('register')}>
              Бүртгүүлэх
            </button>
          </p>
        )}

        {mode === 'register' && (
          <p className="auth-switch">
            Бүртгэлтэй юу?
            <button onClick={() => changeMode('login')}>
              Нэвтрэх
            </button>
          </p>
        )}

        {mode === 'reset' && (
          <p className="auth-switch">
            <button onClick={() => changeMode('login')}>
              ← Нэвтрэх хэсэг рүү буцах
            </button>
          </p>
        )}

        <div className="auth-footer">
          Made with ♡ by Paperie
        </div>

      </div>
    </div>
  )
}

export default Auth
