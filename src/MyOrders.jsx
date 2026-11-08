import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabase'

function MyOrders() {
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchOrders = async () => {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        if (isMounted) {
          setError('Захиалгуудаа харахын тулд нэвтэрнэ үү.')
          setLoading(false)
        }
        return
      }

      const { data, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        if (isMounted) {
          setError('Захиалгын мэдээлэл татахад алдаа гарлаа.')
          setLoading(false)
        }
        return
      }

      const savedOrders = data || []
      let savedItems = []

      if (savedOrders.length > 0) {
        const orderIds = savedOrders.map((order) => order.id)

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)

        if (itemsError) {
          console.error('Захиалгын бараа татахад алдаа:', itemsError)
        } else {
          savedItems = itemsData || []
        }
      }

      if (isMounted) {
        setOrders(savedOrders)
        setOrderItems(savedItems)
        setLoading(false)
      }
    }

    fetchOrders()

    return () => {
      isMounted = false
    }
  }, [])

  const getStatus = (status) => {
    const statuses = {
      pending: 'Хүлээгдэж байна',
      confirmed: 'Баталгаажсан',
      processing: 'Бэлтгэж байна',
      shipped: 'Хүргэлтэд гарсан',
      delivered: 'Хүргэгдсэн',
      cancelled: 'Цуцлагдсан',
    }

    return statuses[status] || status || 'Тодорхойгүй'
  }

  const getStatusClass = (status) => {
    const classes = {
      pending: 'pending',
      confirmed: 'confirmed',
      processing: 'processing',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',
    }

    return classes[status] || 'pending'
  }

  const formatDate = (date) => {
    if (!date) return 'Огноо байхгүй'

    return new Date(date).toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString('en-US') + ' ₮'
  }

  const getItemsForOrder = (orderId) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  return (
    <main className="my-orders-page">
      <div className="my-orders-header">
        <Link to="/" className="my-orders-back">
          ← Дэлгүүр рүү буцах
        </Link>

        <p className="my-orders-subtitle">YOUR PAPERIE JOURNEY</p>
        <h1>Миний захиалгууд ♡</h1>
        <p>Таны хийсэн бүх захиалгын мэдээлэл энд харагдана.</p>
      </div>

      {loading && (
        <div className="orders-message">
          Захиалгуудыг ачаалж байна...
        </div>
      )}

      {!loading && error && (
        <div className="orders-message">
          <p>{error}</p>
          <Link to="/">Нүүр хуудас руу буцах →</Link>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-orders">
          <div className="empty-orders-icon">♡</div>
          <h2>Одоогоор захиалга алга.</h2>
          <p>
            Дуртай бүтээгдэхүүнээ сонгож анхны захиалгаа хийгээрэй.
          </p>
          <Link to="/" className="orders-shop-button">
            Дэлгүүр хэсэх →
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => {
            const items = getItemsForOrder(order.id)
            const isSelected = selectedOrder?.id === order.id

            return (
              <article className="order-card" key={order.id}>
                <div className="order-card-top">
                  <div>
                    <span className="order-label">
                      ЗАХИАЛГЫН ДУГААР
                    </span>

                    <h3>
                      {order.order_number || String(order.id).slice(0, 8)}
                    </h3>

                    <p>{formatDate(order.created_at)}</p>
                  </div>

                  <span
                    className={`order-status ${getStatusClass(order.status)}`}
                  >
                    {getStatus(order.status)}
                  </span>
                </div>

                <div className="order-card-bottom">
                  <div>
                    <span>Бүтээгдэхүүн</span>
                    <strong>{items.length} төрөл</strong>
                  </div>

                  <div>
                    <span>Нийт дүн</span>
                    <strong>{formatPrice(order.total_amount)}</strong>
                  </div>

                  <button
                    type="button"
                    className="order-detail-button"
                    onClick={() =>
                      setSelectedOrder(isSelected ? null : order)
                    }
                  >
                    {isSelected ? 'Хураах ↑' : 'Дэлгэрэнгүй ↓'}
                  </button>
                </div>

                {isSelected && (
                  <div className="order-detail-content">
                    <h4>Захиалсан бүтээгдэхүүн</h4>

                    {items.length === 0 ? (
                      <p>Барааны мэдээлэл олдсонгүй.</p>
                    ) : (
                      <div className="order-detail-items">
                        {items.map((item) => (
                          <div
                            className="order-detail-item"
                            key={item.id}
                          >
                            <div>
                              <strong>{item.product_name}</strong>
                              <p>{item.quantity} ширхэг</p>
                            </div>

                            <strong>
                              {formatPrice(
                                Number(item.unit_price) *
                                  Number(item.quantity)
                              )}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="order-shipping-info">
                      <p>
                        <strong>Хүргэлтийн хаяг:</strong>{' '}
                        {order.shipping_address || 'Мэдээлэл байхгүй'}
                      </p>

                      <p>
                        <strong>Утас:</strong>{' '}
                        {order.phone || 'Мэдээлэл байхгүй'}
                      </p>

                      {order.notes && (
                        <p>
                          <strong>Тэмдэглэл:</strong> {order.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default MyOrders