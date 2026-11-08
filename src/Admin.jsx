import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import './Admin.css'

const tabs = [
  { id: 'dashboard', label: 'Хянах самбар', icon: '▦' },
  { id: 'products', label: 'Бүтээгдэхүүн', icon: '✿' },
  { id: 'orders', label: 'Захиалга', icon: '▤' },
  { id: 'payments', label: 'Төлбөр', icon: '₮' },
]

const orderStatuses = [
  { value: 'pending', label: 'Хүлээгдэж байна' },
  { value: 'processing', label: 'Боловсруулж байна' },
  { value: 'shipped', label: 'Хүргэлтэд гарсан' },
  { value: 'delivered', label: 'Хүргэгдсэн' },
  { value: 'cancelled', label: 'Цуцлагдсан' },
]

function Admin() {
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [profiles, setProfiles] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [savingProduct, setSavingProduct] = useState(false)

  const emptyForm = {
    name: '',
    category_id: '',
    description: '',
    price: '',
    old_price: '',
    stock: '',
    badge: '',
    is_active: true,
    image_url: '',
  }

  const [productForm, setProductForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [search, setSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState('all')

  // ADMIN ЭРХ ШАЛГАХ
  useEffect(() => {
    let mounted = true

    const checkAdmin = async () => {
      const { data: { user: currentUser }, error: authError } =
        await supabase.auth.getUser()

      if (authError || !currentUser) {
        navigate('/', { replace: true })
        return
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', currentUser.id)
          .single()

      if (!mounted) return

      if (profileError || profile?.role !== 'admin') {
        navigate('/', { replace: true })
        return
      }

      setUser(currentUser)
      setChecking(false)
    }

    checkAdmin()

    return () => {
      mounted = false
    }
  }, [navigate])

  // ADMIN МЭДЭЭЛЭЛ ТАТАХ
  const loadAdminData = async () => {
    setLoading(true)
    setError('')

    const [
      productsResult,
      categoriesResult,
      ordersResult,
      paymentsResult,
      profilesResult,
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false }),

      supabase
        .from('categories')
        .select('*')
        .order('name'),

      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('profiles')
        .select('id, full_name, phone, role'),
    ])

    const failed = [
      productsResult,
      categoriesResult,
      ordersResult,
      paymentsResult,
      profilesResult,
    ].find((result) => result.error)

    if (failed) {
      console.error('Admin data error:', failed.error)
      setError(
        'Мэдээлэл татахад алдаа гарлаа. RLS тохиргоогоо шалгана уу.'
      )
    }

    setProducts(productsResult.data || [])
    setCategories(categoriesResult.data || [])
    setOrders(ordersResult.data || [])
    setPayments(paymentsResult.data || [])
    setProfiles(profilesResult.data || [])

    setLoading(false)
  }

  useEffect(() => {
    if (user) loadAdminData()
  }, [user])

  // МЭДЭГДЭЛ
  useEffect(() => {
    if (!notice) return

    const timer = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  // ЗУРАГ URL
  const getImageUrl = (value) => {
    if (!value) return ''
    if (value.startsWith('http')) return value

    return supabase.storage
      .from('product-images')
      .getPublicUrl(value).data.publicUrl
  }

  // БҮТЭЭГДЭХҮҮН НЭМЭХ FORM НЭЭХ
  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({
      ...emptyForm,
      category_id: categories[0]?.id || '',
    })
    setImageFile(null)
    setImagePreview('')
    setShowProductForm(true)
  }

  // БҮТЭЭГДЭХҮҮН ЗАСАХ FORM НЭЭХ
  const openEditProduct = (product) => {
    setEditingProduct(product)

    setProductForm({
      name: product.name || '',
      category_id: product.category_id || '',
      description: product.description || '',
      price: product.price ?? '',
      old_price: product.old_price ?? '',
      stock: product.stock ?? '',
      badge: product.badge || '',
      is_active: product.is_active ?? true,
      image_url: product.image_url || '',
    })

    setImageFile(null)
    setImagePreview(getImageUrl(product.image_url))
    setShowProductForm(true)
  }

  // ЗУРГИЙН ФАЙЛ ШАЛГАХ
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Зөвхөн JPG, PNG, WEBP зураг оруулна уу.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Зургийн хэмжээ 5MB-аас бага байх ёстой.')
      e.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // БҮТЭЭГДЭХҮҮН ХАДГАЛАХ
  const saveProduct = async (e) => {
    e.preventDefault()
    setSavingProduct(true)
    setError('')

    try {
      let imageUrl = productForm.image_url

      if (imageFile) {
        const extension = imageFile.name.split('.').pop()
        const filePath =
          `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        imageUrl = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath).data.publicUrl
      }

      const productData = {
        name: productForm.name.trim(),
        category_id: productForm.category_id || null,
        description: productForm.description.trim(),
        price: Number(productForm.price),
        old_price: productForm.old_price
          ? Number(productForm.old_price)
          : null,
        stock: Number(productForm.stock),
        badge: productForm.badge || null,
        is_active: productForm.is_active,
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      }

      if (
        !productData.name ||
        !Number.isFinite(productData.price) ||
        productData.price <= 0 ||
        !Number.isInteger(productData.stock) ||
        productData.stock < 0
      ) {
        throw new Error('Нэр, үнэ, үлдэгдлээ зөв оруулна уу.')
      }

      let result

      if (editingProduct) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
      } else {
        result = await supabase
          .from('products')
          .insert(productData)
      }

      if (result.error) throw result.error

      setShowProductForm(false)
      setProductForm(emptyForm)
      setImageFile(null)
      setImagePreview('')

      setNotice(
        editingProduct
          ? 'Бүтээгдэхүүн амжилттай шинэчлэгдлээ.'
          : 'Шинэ бүтээгдэхүүн амжилттай нэмэгдлээ.'
      )

      await loadAdminData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Бүтээгдэхүүн хадгалахад алдаа гарлаа.')
    } finally {
      setSavingProduct(false)
    }
  }

  // БҮТЭЭГДЭХҮҮН УСТГАХ
  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `"${product.name}" бүтээгдэхүүнийг устгах уу?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      console.error(error)
      setError(
        'Бүтээгдэхүүн устгаж чадсангүй. Захиалгатай холбоотой эсэхийг шалгана уу.'
      )
      return
    }

    setNotice('Бүтээгдэхүүн устгагдлаа.')
    await loadAdminData()
  }

  // ЗАХИАЛГЫН ТӨЛӨВ ӨӨРЧЛӨХ
  const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (error) {
      console.error(error)
      setError('Захиалгын төлөв өөрчлөхөд алдаа гарлаа.')
      return
    }

    setNotice('Захиалгын төлөв шинэчлэгдлээ.')
    await loadAdminData()
  }

  // ТӨЛБӨРИЙН ТӨЛӨВ
  const updatePaymentStatus = async (paymentId, status) => {
    const { error } = await supabase
      .from('payments')
      .update({ payment_status: status })
      .eq('id', paymentId)

    if (error) {
      console.error(error)
      setError('Төлбөрийн төлөв өөрчлөхөд алдаа гарлаа.')
      return
    }

    setNotice('Төлбөрийн төлөв шинэчлэгдлээ.')
    await loadAdminData()
  }

  // LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const formatMoney = (amount) =>
    `${Number(amount || 0).toLocaleString('en-US')} ₮`

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('mn-MN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—'

  const getProfile = (userId) =>
    profiles.find((profile) => profile.id === userId)

  const totalRevenue = orders
    .filter((order) => order.status !== 'cancelled')
    .reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    )

  const activeProducts = products.filter(
    (product) => product.is_active
  ).length

  const filteredProducts = products.filter((product) =>
    product.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'all') return true
    return order.status === orderFilter
  })

  if (checking) {
    return (
      <div className="admin-loading">
        Админы эрх шалгаж байна...
      </div>
    )
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-logo">
          paperie<span>.</span>
          <small>ADMIN PANEL</small>
        </Link>

        <div className="admin-profile">
          <div className="admin-avatar">P</div>
          <div>
            <strong>Paperie Admin</strong>
            <small>{user?.email}</small>
          </div>
        </div>

        <nav className="admin-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={
                activeTab === tab.id ? 'active' : ''
              }
              onClick={() => {
                setActiveTab(tab.id)
                setSearch('')
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <Link to="/">← Дэлгүүр рүү буцах</Link>
          <button onClick={handleLogout}>Гарах</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>PAPERIE STORE / ADMIN</p>
            <h1>
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h1>
          </div>

          <button
            className="admin-refresh"
            onClick={loadAdminData}
            disabled={loading}
          >
            ↻ Шинэчлэх
          </button>
        </header>

        {error && (
          <div className="admin-alert error">
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {notice && (
          <div className="admin-alert success">
            ✓ {notice}
          </div>
        )}

        {loading && (
          <p className="admin-loading-inline">
            Мэдээлэл ачаалж байна...
          </p>
        )}

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <>
            <div className="admin-welcome">
              <div>
                <p>WELCOME BACK ♡</p>
                <h2>Тавтай морил, админ!</h2>
                <span>
                  Paperie Store-ийн үйл ажиллагааг эндээс удирдаарай.
                </span>
              </div>
              <span className="admin-welcome-flower">✿</span>
            </div>

            <div className="admin-stat-grid">
              <div className="admin-stat-card">
                <span>✿</span>
                <p>Нийт бүтээгдэхүүн</p>
                <strong>{products.length}</strong>
                <small>{activeProducts} идэвхтэй</small>
              </div>

              <div className="admin-stat-card">
                <span>▤</span>
                <p>Нийт захиалга</p>
                <strong>{orders.length}</strong>
                <small>
                  {orders.filter((o) => o.status === 'pending').length}
                  {' '}хүлээгдэж буй
                </small>
              </div>

              <div className="admin-stat-card">
                <span>₮</span>
                <p>Захиалгын нийт дүн</p>
                <strong>{formatMoney(totalRevenue)}</strong>
                <small>Цуцлагдсан захиалгыг хасаад</small>
              </div>

              <div className="admin-stat-card">
                <span>♡</span>
                <p>Нийт хэрэглэгч</p>
                <strong>{profiles.length}</strong>
                <small>
                  {profiles.filter((p) => p.role === 'customer').length}
                  {' '}хэрэглэгч
                </small>
              </div>
            </div>

            <section className="admin-section">
              <div className="admin-section-heading">
                <div>
                  <p>RECENT ACTIVITY</p>
                  <h2>Сүүлийн захиалгууд</h2>
                </div>
                <button onClick={() => setActiveTab('orders')}>
                  Бүгдийг харах →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="admin-empty">
                  Одоогоор захиалга алга.
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Захиалгын дугаар</th>
                        <th>Хэрэглэгч</th>
                        <th>Огноо</th>
                        <th>Нийт дүн</th>
                        <th>Төлөв</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td>{order.order_number || order.id.slice(0, 8)}</td>
                          <td>
                            {getProfile(order.user_id)?.full_name || 'Хэрэглэгч'}
                          </td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>{formatMoney(order.total_amount)}</td>
                          <td>
                            <span className={`admin-status ${order.status}`}>
                              {orderStatuses.find(
                                (s) => s.value === order.status
                              )?.label || order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="admin-section">
              <div className="admin-section-heading">
                <div>
                  <p>INVENTORY</p>
                  <h2>Бүтээгдэхүүний үлдэгдэл</h2>
                </div>
                <button onClick={() => setActiveTab('products')}>
                  Бүтээгдэхүүн удирдах →
                </button>
              </div>

              <div className="admin-low-stock">
                {products.filter((p) => Number(p.stock) <= 5).length === 0
                  ? 'Үлдэгдэл багатай бүтээгдэхүүн одоогоор алга.'
                  : products
                      .filter((p) => Number(p.stock) <= 5)
                      .map((p) => (
                        <div key={p.id}>
                          <span>{p.name}</span>
                          <strong>{p.stock} ширхэг</strong>
                        </div>
                      ))}
              </div>
            </section>
          </>
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p>PRODUCT MANAGEMENT</p>
                <h2>Бүтээгдэхүүний жагсаалт</h2>
              </div>

              <button
                className="admin-primary-button"
                onClick={openNewProduct}
              >
                + Бүтээгдэхүүн нэмэх
              </button>
            </div>

            <div className="admin-toolbar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Бүтээгдэхүүн хайх..."
              />
              <span>{filteredProducts.length} бүтээгдэхүүн</span>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table admin-product-table">
                <thead>
                  <tr>
                    <th>Бүтээгдэхүүн</th>
                    <th>Ангилал</th>
                    <th>Үнэ</th>
                    <th>Үлдэгдэл</th>
                    <th>Төлөв</th>
                    <th>Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td data-label="Бүтээгдэхүүн">
                        <div className="admin-product-cell">
                          {product.image_url ? (
                            <img
                              src={getImageUrl(product.image_url)}
                              alt={product.name}
                            />
                          ) : (
                            <div className="admin-no-image">✿</div>
                          )}
                          <strong>{product.name}</strong>
                        </div>
                      </td>

                      <td data-label="Ангилал">
                        {product.categories?.name || '—'}
                      </td>

                      <td data-label="Үнэ">
                        {formatMoney(product.price)}
                      </td>

                      <td data-label="Үлдэгдэл">
                        {product.stock}
                      </td>

                      <td data-label="Төлөв">
                        <span
                          className={`admin-status ${
                            product.is_active ? 'completed' : 'cancelled'
                          }`}
                        >
                          {product.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                        </span>
                      </td>

                      <td data-label="Үйлдэл">
                        <div className="admin-actions">
                          <button onClick={() => openEditProduct(product)}>
                            Засах
                          </button>
                          <button
                            className="delete"
                            onClick={() => deleteProduct(product)}
                          >
                            Устгах
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="6">Бүтээгдэхүүн олдсонгүй.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p>ORDER MANAGEMENT</p>
                <h2>Захиалгууд</h2>
              </div>
            </div>

            <div className="admin-toolbar">
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              >
                <option value="all">Бүх захиалга</option>
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <span>{filteredOrders.length} захиалга</span>
            </div>

            {/* Компьютерийн хүснэгт */}
            <div className="admin-table-wrap admin-orders-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Захиалгын дугаар</th>
                    <th>Хэрэглэгч</th>
                    <th>Утас</th>
                    <th>Хүргэлтийн хаяг</th>
                    <th>Нийт дүн</th>
                    <th>Огноо</th>
                    <th>Төлөв өөрчлөх</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.order_number || order.id.slice(0, 8)}</td>
                      <td>
                        {getProfile(order.user_id)?.full_name || 'Хэрэглэгч'}
                      </td>
                      <td>{order.phone || '—'}</td>
                      <td>{order.shipping_address || '—'}</td>
                      <td>{formatMoney(order.total_amount)}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={order.status}
                          onChange={(e) =>
                            updateOrderStatus(order.id, e.target.value)
                          }
                        >
                          {orderStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="7">Захиалга олдсонгүй.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Гар утасны карт */}
            <div className="admin-orders-mobile">
              {filteredOrders.map((order) => (
                <article className="admin-order-card" key={order.id}>
                  <div className="admin-order-card-heading">
                    <div>
                      <span className="admin-order-label">ЗАХИАЛГЫН ДУГААР</span>
                      <strong className="admin-order-number">
                        {order.order_number || order.id.slice(0, 8)}
                      </strong>
                    </div>
                    <span className={`admin-status ${order.status}`}>
                      {orderStatuses.find(
                        (status) => status.value === order.status
                      )?.label || order.status}
                    </span>
                  </div>

                  <div className="admin-order-info">
                    <div className="admin-order-info-row">
                      <span>Хэрэглэгч</span>
                      <strong>
                        {getProfile(order.user_id)?.full_name || 'Хэрэглэгч'}
                      </strong>
                    </div>

                    <div className="admin-order-info-row">
                      <span>Утас</span>
                      <strong>{order.phone || '—'}</strong>
                    </div>

                    <div className="admin-order-info-row">
                      <span>Хүргэлтийн хаяг</span>
                      <strong>{order.shipping_address || '—'}</strong>
                    </div>

                    <div className="admin-order-info-row">
                      <span>Нийт дүн</span>
                      <strong>{formatMoney(order.total_amount)}</strong>
                    </div>

                    <div className="admin-order-info-row">
                      <span>Огноо</span>
                      <strong>{formatDate(order.created_at)}</strong>
                    </div>
                  </div>

                  <div className="admin-order-status-control">
                    <label>Захиалгын төлөв өөрчлөх</label>
                    <select
                      className="admin-status-select"
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value)
                      }
                    >
                      {orderStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}

              {filteredOrders.length === 0 && (
                <div className="admin-empty">
                  Захиалга олдсонгүй.
                </div>
              )}
            </div>
          </section>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p>PAYMENT MANAGEMENT</p>
                <h2>Төлбөрийн мэдээлэл</h2>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Захиалгын ID</th>
                    <th>Дүн</th>
                    <th>Төлбөрийн хэлбэр</th>
                    <th>Гүйлгээний дугаар</th>
                    <th>Төлсөн огноо</th>
                    <th>Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.order_id?.slice(0, 8) || '—'}</td>
                      <td>{formatMoney(payment.amount)}</td>
                      <td>{payment.payment_method || '—'}</td>
                      <td>{payment.transaction_id || '—'}</td>
                      <td>{formatDate(payment.paid_at)}</td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={payment.payment_status || 'pending'}
                          onChange={(e) =>
                            updatePaymentStatus(payment.id, e.target.value)
                          }
                        >
                          <option value="pending">Хүлээгдэж байна</option>
                          <option value="paid">Төлөгдсөн</option>
                          <option value="failed">Амжилтгүй</option>
                          <option value="refunded">Буцаагдсан</option>
                        </select>
                      </td>
                    </tr>
                  ))}

                  {payments.length === 0 && (
                    <tr>
                      <td colSpan="6">
                        Одоогоор төлбөрийн бүртгэл алга.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* PRODUCT FORM MODAL */}
      {showProductForm && (
        <div
          className="admin-modal-overlay"
          onClick={() => !savingProduct && setShowProductForm(false)}
        >
          <div
            className="admin-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-heading">
              <div>
                <p>PRODUCT INFORMATION</p>
                <h2>
                  {editingProduct
                    ? 'Бүтээгдэхүүн засах'
                    : 'Шинэ бүтээгдэхүүн нэмэх'}
                </h2>
              </div>
              <button
                onClick={() => setShowProductForm(false)}
                disabled={savingProduct}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <label>Бүтээгдэхүүний нэр *</label>
              <input
                required
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    name: e.target.value,
                  })
                }
                placeholder="Бүтээгдэхүүний нэр"
              />

              <label>Ангилал</label>
              <select
                value={productForm.category_id}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    category_id: e.target.value,
                  })
                }
              >
                <option value="">Ангилал сонгох</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <label>Тайлбар</label>
              <textarea
                rows="3"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
                placeholder="Бүтээгдэхүүний тайлбар..."
              />

              <div className="admin-form-grid">
                <div>
                  <label>Үнэ (₮) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Хуучин үнэ (₮)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.old_price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        old_price: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Үлдэгдэл *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        stock: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Badge</label>
                  <select
                    value={productForm.badge}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        badge: e.target.value,
                      })
                    }
                  >
                    <option value="">Байхгүй</option>
                    <option value="NEW">NEW</option>
                    <option value="POPULAR">POPULAR</option>
                    <option value="BEST SELLER">BEST SELLER</option>
                  </select>
                </div>
              </div>

              <label>Бүтээгдэхүүний зураг (JPG, PNG, WEBP / 5MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />

              {imagePreview && (
                <div className="admin-image-preview">
                  <img src={imagePreview} alt="Зургийн урьдчилсан харагдац" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview('')
                      setProductForm({
                        ...productForm,
                        image_url: '',
                      })
                    }}
                  >
                    Зураг арилгах
                  </button>
                </div>
              )}

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={productForm.is_active}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      is_active: e.target.checked,
                    })
                  }
                />
                Дэлгүүрт идэвхтэй харагдуулах
              </label>

              {error && (
                <p className="admin-form-error">{error}</p>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-cancel-button"
                  onClick={() => setShowProductForm(false)}
                  disabled={savingProduct}
                >
                  Болих
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={savingProduct}
                >
                  {savingProduct
                    ? 'Хадгалж байна...'
                    : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin