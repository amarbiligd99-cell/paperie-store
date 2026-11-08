
import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabase'
import ProductDetail from './ProductDetail'
import MyOrders from './MyOrders'
import './App.css'
import Admin from './Admin'
import Profile from './Profile'

function PasswordInput({ value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="password-field">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={onToggle}
        aria-label={show ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}
        title={show ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}
      >
        {show ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 9 4.7 10 7-.4.9-1.3 2.2-2.6 3.4M6.2 6.2C3.8 7.7 2.4 10 2 12c1 2.3 4.8 7 10 7 1.2 0 2.3-.2 3.3-.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

function StoreHome() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Бүгд')

  const [showCart, setShowCart] = useState(false)
  const [cartToast, setCartToast] = useState(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [showCheckout, setShowCheckout] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)

  // БҮТЭЭГДЭХҮҮН БОЛОН АНГИЛАЛ ТАТАХ
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')

      const { data: productData, error: productError } =
        await supabase
          .from('products')
          .select('*, categories(name)')
          .order('created_at', { ascending: false })

      if (productError) {
        setError(productError.message)
        setLoading(false)
        return
      }

      const { data: categoryData, error: categoryError } =
        await supabase
          .from('categories')
          .select('*')

      if (categoryError) {
        console.error(categoryError)
      }

      setProducts(productData || [])
      setCategories(categoryData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // НЭВТЭРСЭН ХЭРЭГЛЭГЧ ШАЛГАХ
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ХЭРЭГЛЭГЧ АДМИН ЭРХТЭЙ ЭСЭХИЙГ ШАЛГАХ
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Админ эрх шалгахад алдаа:', error)
        setIsAdmin(false)
        return
      }

      setIsAdmin(data?.role === 'admin')
    }

    checkAdmin()
  }, [user])

  // САГСАНД НЭМЭГДСЭН МЭДЭГДЛИЙГ 2.5 СЕКУНДЫН ДАРАА АРИЛГАХ
  useEffect(() => {
    if (!cartToast) return

    const timer = setTimeout(() => {
      setCartToast(null)
    }, 2500)

    return () => clearTimeout(timer)
  }, [cartToast])

  // НЭВТРЭГСЭН ХЭРЭГЛЭГЧИЙН САГСЫГ DATABASE-ААС ТАТАХ
  useEffect(() => {
    let isMounted = true

    const fetchUserCart = async () => {
      if (!user) {
        setCart([])
        return
      }

      setCart([])

      const { data, error } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, products(*)')
        .eq('user_id', user.id)

      if (error) {
        console.error('Сагс татахад алдаа:', error)
        return
      }

      if (!isMounted) return

      const savedCart = (data || [])
        .filter((item) => item.products)
        .map((item) => ({
          ...item.products,
          quantity: item.quantity,
        }))

      setCart(savedCart)
    }

    fetchUserCart()

    return () => {
      isMounted = false
    }
  }, [user])

  // ЗУРГИЙН URL
  const getImageUrl = (image) => {
    if (!image) return ''
    if (image.startsWith('http')) return image

    return supabase.storage
      .from('product-images')
      .getPublicUrl(image).data.publicUrl
  }

  // САГСАНД НЭМЭХ
  const addToCart = async (product) => {
    if (!product.stock || product.stock <= 0) return

    const existing = cart.find(
      (item) => item.id === product.id
    )

    if (existing && existing.quantity >= product.stock) return

    const newQuantity = (existing?.quantity || 0) + 1

    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .upsert(
          {
            user_id: user.id,
            product_id: product.id,
            quantity: newQuantity,
          },
          {
            onConflict: 'user_id,product_id',
          }
        )

      if (error) {
        console.error('Сагсанд нэмэхэд алдаа:', error)
        alert('Сагсанд нэмэхэд алдаа гарлаа.')
        return
      }
    }

    setCart((previousCart) => {
      if (existing) {
        return previousCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      }

      return [
        ...previousCart,
        { ...product, quantity: 1 },
      ]
    })

    setCartToast({
      message: `${product.name} сагсанд нэмэгдлээ!`,
      id: Date.now(),
    })
  }

  // ТОО НЭМЭХ
  const increaseQuantity = async (id) => {
    const item = cart.find((item) => item.id === id)

    if (!item || item.quantity >= item.stock) return

    const newQuantity = item.quantity + 1

    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('user_id', user.id)
        .eq('product_id', id)

      if (error) {
        console.error('Тоо нэмэхэд алдаа:', error)
        return
      }
    }

    setCart((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  // ТОО ХАСАХ
  const decreaseQuantity = async (id) => {
    const item = cart.find((item) => item.id === id)

    if (!item) return

    if (item.quantity <= 1) {
      await removeFromCart(id)
      return
    }

    const newQuantity = item.quantity - 1

    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('user_id', user.id)
        .eq('product_id', id)

      if (error) {
        console.error('Тоо хасахад алдаа:', error)
        return
      }
    }

    setCart((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  // САГСНААС УСТГАХ
  const removeFromCart = async (id) => {
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', id)

      if (error) {
        console.error('Сагснаас устгахад алдаа:', error)
        return
      }
    }

    setCart((previous) =>
      previous.filter((item) => item.id !== id)
    )
  }

  
  // БҮТЭЭГДЭХҮҮНИЙ НЭРИЙГ МОНГОЛЧЛОХ
  const productNameTranslations = {
    'Colorful Highlighters': 'Өнгийн тодруулагч',
    'Study Notebook': 'Хичээлийн дэвтэр',
    'Aesthetic Notebook': 'Загварлаг дэвтэр',
    'Daily Planner': 'Өдөр тутмын төлөвлөгч',
    'Sticky Notes Set': 'Наадаг тэмдэглэлийн цаасны багц',
    'Pastel Journal': 'Пастель өнгийн тэмдэглэлийн дэвтэр',
    'Creative Art Set': 'Бүтээлч урлагийн багц',
    'Minimal Pen Set' : 'Олон өнгийн бал'
  }

  const getProductName = (product) =>
    productNameTranslations[product.name] || product.name

  // ХАЙЛТ БОЛОН АНГИЛЛААР ШҮҮХ
  const filteredProducts = products.filter((product) => {
    const searchText = search.trim().toLowerCase()

    const productName = getProductName(product).toLowerCase()
    const originalName = (product.name || '').toLowerCase()
    const categoryName = (product.categories?.name || '').toLowerCase()

    const matchesSearch =
      productName.includes(searchText) ||
      originalName.includes(searchText) ||
      categoryName.includes(searchText)

    const matchesCategory =
      selectedCategory === 'Бүгд' ||
      categoryName === selectedCategory.toLowerCase()

    return matchesSearch && matchesCategory
  })


  // САГСНЫ НИЙТ ТОО
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  )

  // САГСНЫ НИЙТ ҮНЭ
  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0
  )

  // НЭВТРЭХ
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setAuthLoading(false)

    if (error) {
      setAuthError('Имэйл эсвэл нууц үг буруу байна.')
      return
    }

    setIsAuthOpen(false)
    setEmail('')
    setPassword('')
  }

  // БҮРТГҮҮЛЭХ
  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (password.length < 6) {
      setAuthError('Нууц үг хамгийн багадаа 6 тэмдэгт байна.')
      return
    }

    if (password !== confirmPassword) {
      setAuthError('Нууц үг хоорондоо таарахгүй байна.')
      return
    }

    setAuthLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    })

    setAuthLoading(false)

    if (error) {
      setAuthError(error.message)
      return
    }

    if (data?.session && data?.user) {
      setUser(data.user)
      setIsAuthOpen(false)
      setFullName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setAuthError('')
    } else {
      setAuthMode('login')
      setPassword('')
      setConfirmPassword('')
      setAuthError('')
    }
  }

  // НУУЦ ҮГ СЭРГЭЭХ
  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError('Эхлээд имэйл хаягаа оруулна уу.')
      return
    }

    setAuthError('')

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin,
      }
    )

    setAuthError(
      error
        ? error.message
        : 'Нууц үг сэргээх холбоос имэйлээр илгээгдлээ.'
    )
  }

  // ГАРАХ
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCart([])
  }

  // ЗАХИАЛГА ХИЙХ
  const handleCheckout = async (e) => {
    e.preventDefault()
    setCheckoutError('')

    if (!user) {
      setShowCheckout(false)
      setShowCart(false)
      setAuthMode('login')
      setIsAuthOpen(true)
      return
    }

    if (cart.length === 0) {
      setCheckoutError('Таны сагс хоосон байна.')
      return
    }

    if (!shippingAddress.trim() || !phone.trim()) {
      setCheckoutError(
        'Хүргэлтийн хаяг болон утасны дугаараа оруулна уу.'
      )
      return
    }

    setCheckoutLoading(true)

    try {
      // БҮТЭЭГДЭХҮҮНИЙ ҮЛДЭГДЭЛ ШАЛГАХ
      for (const item of cart) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, stock')
          .eq('id', item.id)
          .single()

        if (
          error ||
          !data ||
          Number(data.stock) < item.quantity
        ) {
          throw new Error(
            `${item.name} бүтээгдэхүүний үлдэгдэл хүрэлцэхгүй байна.`
          )
        }
      }

      // ORDERS ХҮСНЭГТЭД ЗАХИАЛГА ҮҮСГЭХ
      const { data: order, error: orderError } =
        await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_amount: cartTotal,
            status: 'pending',
            shipping_address: shippingAddress.trim(),
            phone: phone.trim(),
            notes: notes.trim() || null,
          })
          .select()
          .single()

      if (orderError) throw orderError

      // ORDER_ITEMS ХҮСНЭГТЭД БАРААНУУД ХАДГАЛАХ
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw itemsError
      }

      // DATABASE ДЭЭРХ САГСЫГ ЦЭВЭРЛЭХ
      const { error: clearCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (clearCartError) {
        console.error('Сагс цэвэрлэхэд алдаа:', clearCartError)
      }

      // ЗАХИАЛГА АМЖИЛТТАЙ
      setOrderSuccess(order)

      setCart([])
      setShippingAddress('')
      setPhone('')
      setNotes('')

      setShowCheckout(false)
      setShowCart(false)
    } catch (err) {
      console.error(err)
      setCheckoutError(
        err.message || 'Захиалга хийхэд алдаа гарлаа.'
      )
    } finally {
      setCheckoutLoading(false)
    }
  }

  // ЗАХИАЛГА ХИЙХ ТОВЧ
  const openCheckout = () => {
    if (!user) {
      setShowCart(false)
      setAuthMode('login')
      setAuthError('')
      setIsAuthOpen(true)
      return
    }

    setCheckoutError('')
    setShowCheckout(true)
  }

  return (
    <div className="app">

      {/* HEADER */}
      <header className="store-header">
        <a href="#home" className="logo">
          paperie<span>.</span>
          <small>YOUR LITTLE HAPPY PLACE</small>
        </a>

        <nav>
          <a href="#home">Нүүр</a>
          <a href="#products">Бүтээгдэхүүн</a>
          <a href="#categories">Ангилал</a>
          <a href="#about">Бидний тухай</a>
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link to="/orders" className="login-button">
                Миний захиалга
              </Link>

              {isAdmin && (
                <Link to="/admin" className="login-button">
                  Админ самбар
                </Link>
              )}

              <button
                className="login-button"
                onClick={handleLogout}
              >
                Гарах
              </button>
            </>
          ) : (
            <button
              className="login-button"
              onClick={() => {
                setAuthMode('login')
                setAuthError('')
                setIsAuthOpen(true)
              }}
            >
              Нэвтрэх →
            </button>
          )}

          <button
            className="cart-button"
            onClick={() => setShowCart(true)}
          >
            🛒 Сагс ({cartCount})
          </button>

          {user && (
            <Link
              to="/profile"
              className="header-profile-icon"
              title="Миний профайл"
              aria-label="Миний профайл"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="home">
        <p>A LITTLE JOY IN EVERY PAGE</p>

        <h1>
          Make your everyday <i>lovely.</i>
        </h1>

        <p>
          Өдөр бүрийг илүү бүтээлч, өнгөлөг, аз жаргалтай
          болгох жижигхэн зүйлсийг биднээс олоорой.
        </p>

        <a href="#products" className="hero-button">
          Дэлгүүр үзэх →
        </a>
      </section>

      {/* CATEGORIES */}
      <section className="categories" id="categories">
        <p>FIND YOUR FAVORITE</p>
        <h2>Shop by category ♡</h2>

        <div className="category-list">
          {['Бүгд', ...categories.map((c) => c.name)].map(
            (category, index) => (
              <button
                key={`${category}-${index}`}
                className={
                  selectedCategory === category ? 'active' : ''
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            )
          )}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="products-section" id="products">
        <div className="products-heading">
          <div>
            <p>CURATED JUST FOR YOU</p>
            <h2>Our lovely picks ✿</h2>
          </div>

          <input
            type="text"
            placeholder="Бүтээгдэхүүн хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading && (
          <p className="status-message">
            Бүтээгдэхүүн ачаалж байна...
          </p>
        )}

        {error && (
          <p className="error-message">
            Алдаа: {error}
          </p>
        )}

        {!loading && !error && (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div className="product-card" key={product.id}>
                <div className="product-image">
                  {product.image_url ? (
                    <img
                      src={getImageUrl(product.image_url)}
                      alt={product.name}
                    />
                  ) : (
                    <div className="no-image">✿</div>
                  )}
                </div>

                <div className="product-details">
                  <p className="product-category">
                    {product.categories?.name || 'Бүтээгдэхүүн'}
                  </p>

                 <h3>{getProductName(product)}</h3>

                  <Link
                    to={`/product/${product.id}`}
                    className="product-detail-link"
                  >
                    Дэлгэрэнгүй →
                  </Link>

                  <p className="product-price">
                    {Number(product.price).toLocaleString('en-US')} ₮
                  </p>

                  <p className="stock">
                    Үлдэгдэл: {product.stock ?? 0} ширхэг
                  </p>

                  <button
                    className="add-cart-button"
                    onClick={() => addToCart(product)}
                    disabled={
                      !product.stock ||
                      cart.some(
                        (item) =>
                          item.id === product.id &&
                          item.quantity >= product.stock
                      )
                    }
                  >
                    Сагсанд нэмэх +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <p className="status-message">
            Бүтээгдэхүүн олдсонгүй.
          </p>
        )}
      </section>

      {/* FLOATING CART */}
      <button
        className="floating-cart"
        onClick={() => setShowCart(true)}
      >
        🛒
        {cartCount > 0 && (
          <span className="cart-badge">{cartCount}</span>
        )}
      </button>

      {/* CART DRAWER */}
      {showCart && (
        <div
          className="cart-overlay"
          onClick={() => setShowCart(false)}
        >
          <div
            className="cart-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-drawer-header">
              <div>
                <p className="cart-subtitle">
                  YOUR LITTLE HAPPY PLACE
                </p>

                <h2>Миний сагс ♡</h2>

                <span>{cartCount} бүтээгдэхүүн</span>
              </div>

              <button
                className="close-cart"
                onClick={() => setShowCart(false)}
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <span>🛒</span>
                <h3>Таны сагс хоосон байна.</h3>

                <p>
                  Та дуртай бүтээгдэхүүнээ сонгоорой.
                </p>

                <button onClick={() => setShowCart(false)}>
                  Дэлгүүр хэсэх →
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                      />

                      <div className="cart-item-info">
                        <h3>{item.name}</h3>

                        <strong>
                          {Number(item.price).toLocaleString('en-US')} ₮
                        </strong>

                        <div className="quantity-control">
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() => increaseQuantity(item.id)}
                            disabled={item.quantity >= item.stock}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="cart-item-right">
                        <strong>
                          {(
                            Number(item.price) * item.quantity
                          ).toLocaleString('en-US')} ₮
                        </strong>

                        <button
                          className="remove-cart-item"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Устгах
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="cart-total">
                    <span>Нийт дүн</span>

                    <strong>
                      {cartTotal.toLocaleString('en-US')} ₮
                    </strong>
                  </div>

                  <p>
                    Хүргэлтийн төлбөр захиалгын үед тооцогдоно.
                  </p>

                  <button
                    className="checkout-button"
                    onClick={openCheckout}
                  >
                    Захиалга хийх →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {showCheckout && (
        <div
          className="auth-overlay"
          onClick={() =>
            !checkoutLoading && setShowCheckout(false)
          }
        >
          <div
            className="auth-modal checkout-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-close"
              onClick={() => setShowCheckout(false)}
              disabled={checkoutLoading}
            >
              ×
            </button>

            <div className="auth-logo">
              paperie<span>.</span>
              <small>YOUR LITTLE HAPPY PLACE</small>
            </div>

            <div className="auth-heart">♡</div>

            <h2>Захиалгаа баталгаажуулах</h2>

            <p className="auth-description">
              Хүргэлтийн мэдээллээ оруулна уу.
            </p>

            <form onSubmit={handleCheckout}>
              <label>Хүргэлтийн хаяг</label>

              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Дүүрэг, хороо, байр, тоот..."
                rows="3"
                required
              />

              <label>Утасны дугаар</label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Утасны дугаараа оруулна уу"
                required
              />

              <label>Нэмэлт тэмдэглэл (заавал биш)</label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Хүргэлтийн нэмэлт мэдээлэл..."
                rows="2"
              />

              <div className="checkout-review">
                <span>{cartCount} бүтээгдэхүүн</span>

                <strong>
                  {cartTotal.toLocaleString('en-US')} ₮
                </strong>
              </div>

              {checkoutError && (
                <p className="auth-error">{checkoutError}</p>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? 'Захиалга үүсгэж байна...'
                  : 'Захиалга баталгаажуулах →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ORDER SUCCESS */}
      {orderSuccess && (
        <div
          className="auth-overlay"
          onClick={() => setOrderSuccess(null)}
        >
          <div
            className="auth-modal order-success-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-close"
              onClick={() => setOrderSuccess(null)}
            >
              ×
            </button>

            <div className="auth-logo">
              paperie<span>.</span>
              <small>YOUR LITTLE HAPPY PLACE</small>
            </div>

            <div className="auth-heart">♡</div>

            <h2>Захиалга амжилттай!</h2>

            <p className="auth-description">
              Таны захиалгыг хүлээн авлаа. Баярлалаа!
            </p>

            <div className="order-success-details">
              <p>Захиалгын дугаар</p>

              <strong>
                {orderSuccess.order_number || String(orderSuccess.id).slice(0, 8)}
              </strong>

              <p>Нийт дүн</p>

              <strong>
                {Number(orderSuccess.total_amount).toLocaleString('en-US')} ₮
              </strong>

              <p>Төлөв: Хүлээгдэж байна</p>
            </div>

            <button
              className="auth-submit"
              onClick={() => setOrderSuccess(null)}
            >
              Үргэлжлүүлэх →
            </button>
          </div>
        </div>
      )}

      {/* LOGIN / REGISTER */}
      {isAuthOpen && (
        <div
          className="auth-overlay"
          onClick={() => setIsAuthOpen(false)}
        >
          <div
            className="auth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="auth-close"
              onClick={() => setIsAuthOpen(false)}
            >
              ×
            </button>

            <div className="auth-logo">
              paperie<span>.</span>
              <small>YOUR LITTLE HAPPY PLACE</small>
            </div>

            <div className="auth-heart">♡</div>

            {authMode === 'login' ? (
              <>
                <h2>Тавтай морил!</h2>

                <p className="auth-description">
                  Paperie дэлгүүртээ дахин зочилсонд баярлалаа.
                </p>

                <form onSubmit={handleLogin}>
                  <label>Имэйл хаяг</label>

                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <label>Нууц үг</label>

                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword((value) => !value)
                    }
                    placeholder="Нууц үгээ оруулна уу"
                  />

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={handleForgotPassword}
                  >
                    Нууц үгээ мартсан уу?
                  </button>

                  {authError && (
                    <p className="auth-error">{authError}</p>
                  )}

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? 'Түр хүлээнэ үү...'
                      : 'Нэвтрэх →'}
                  </button>
                </form>

                <p className="auth-switch">
                  Бүртгэлгүй юу?

                  <button
                    onClick={() => {
                      setAuthMode('register')
                      setAuthError('')
                    }}
                  >
                    Бүртгүүлэх
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2>Бүртгэл үүсгэх ♡</h2>

                <p className="auth-description">
                  Өөрийн Paperie бүртгэлийг үүсгээрэй.
                </p>

                <form onSubmit={handleRegister}>
                  <label>Таны нэр</label>

                  <input
                    type="text"
                    placeholder="Нэрээ оруулна уу"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <label>Имэйл хаяг</label>

                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <label>Нууц үг</label>

                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    show={showPassword}
                    onToggle={() =>
                      setShowPassword((value) => !value)
                    }
                    placeholder="Нууц үгээ оруулна уу"
                  />

                  <label>Нууц үг давтах</label>

                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    show={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    placeholder="Нууц үгээ дахин оруулна уу"
                  />

                  {authError && (
                    <p className="auth-error">{authError}</p>
                  )}

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? 'Түр хүлээнэ үү...'
                      : 'Бүртгүүлэх →'}
                  </button>
                </form>

                <p className="auth-switch">
                  Бүртгэлтэй юу?

                  <button
                    onClick={() => {
                      setAuthMode('login')
                      setAuthError('')
                    }}
                  >
                    Нэвтрэх
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* CART SUCCESS TOAST */}
      {cartToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: '28px',
            bottom: '28px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: 'calc(100vw - 40px)',
            padding: '16px 22px',
            background: '#ffffff',
            border: '1px solid #e8dcf5',
            borderLeft: '4px solid #7055ce',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(65, 43, 91, 0.14)',
            color: '#493b55',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '27px',
              height: '27px',
              minWidth: '27px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: '#f0eafa',
              color: '#7055ce',
              fontWeight: 700,
            }}
          >
            ✓
          </span>
          <span>{cartToast.message}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer id="about">
        <div className="logo">
          paperie<span>.</span>
          <small>YOUR LITTLE HAPPY PLACE</small>
        </div>

        <p>© 2026 Paperie Store. All rights reserved.</p>
        <p>Made with ♡</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreHome />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/orders" element={<MyOrders />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App
