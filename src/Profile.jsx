import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import './Profile.css'

function Profile() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !user) {
        navigate('/')
        return
      }

      setUser(user)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        setError('Профайлын мэдээлэл татахад алдаа гарлаа.')
        console.error(profileError)
      } else if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!user) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      })
      .eq('id', user.id)

    setSaving(false)

    if (saveError) {
      console.error(saveError)
      setError('Мэдээлэл хадгалахад алдаа гарлаа.')
      return
    }

    setMessage('Таны мэдээлэл амжилттай хадгалагдлаа.')
  }

  if (loading) {
    return (
      <div className="profile-loading">
        Мэдээлэл ачаалж байна...
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <Link to="/" className="profile-logo">
          paperie<span>.</span>
          <small>YOUR LITTLE HAPPY PLACE</small>
        </Link>

        <Link to="/" className="profile-back">
          ← Дэлгүүр рүү буцах
        </Link>
      </header>

      <main className="profile-container">
        <div className="profile-heading">
          <p>YOUR ACCOUNT</p>
          <h1>Миний профайл ♡</h1>
          <span>
            Хувийн мэдээллээ харах болон шинэчлэх
          </span>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            {profile.full_name
              ? profile.full_name.charAt(0).toUpperCase()
              : '♡'}
          </div>

          <h2>{profile.full_name || 'Хэрэглэгч'}</h2>
          <p>{user?.email}</p>

          <div className="profile-divider" />

          <form onSubmit={handleSave}>
            <div className="profile-field">
              <label>Таны нэр</label>
              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                placeholder="Нэрээ оруулна уу"
                required
              />
            </div>

            <div className="profile-field">
              <label>Имэйл хаяг</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
              />
              <small>Имэйл хаягийг энд өөрчлөх боломжгүй.</small>
            </div>

            <div className="profile-field">
              <label>Утасны дугаар</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Утасны дугаараа оруулна уу"
              />
            </div>

            <div className="profile-field">
              <label>Хүргэлтийн хаяг</label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Дүүрэг, хороо, байр, тоот..."
                rows="3"
              />
            </div>

            {message && (
              <p className="profile-success">{message}</p>
            )}

            {error && (
              <p className="profile-error">{error}</p>
            )}

            <button
              type="submit"
              className="profile-save"
              disabled={saving}
            >
              {saving ? 'Хадгалж байна...' : 'Мэдээлэл хадгалах →'}
            </button>
          </form>

          <div className="profile-divider" />

          <Link to="/orders" className="profile-orders">
            Миний захиалгууд →
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Profile