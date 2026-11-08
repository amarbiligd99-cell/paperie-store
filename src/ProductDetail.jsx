import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from './supabase'

function ProductDetail() {
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchProduct = async () => {
      setLoading(true)
      setError('')

      const { data, error: productError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single()

      if (!isMounted) return

      if (productError) {
        setError('Бүтээгдэхүүний мэдээллийг авахад алдаа гарлаа.')
        setProduct(null)
      } else {
        setProduct(data)
      }

      setLoading(false)
    }

    fetchProduct()

    return () => {
      isMounted = false
    }
  }, [id])

  const imageUrl = product?.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : supabase.storage
          .from('product-images')
          .getPublicUrl(product.image_url).data.publicUrl
    : ''

  if (loading) {
    return (
      <div className="product-detail-status">
        Бүтээгдэхүүн ачаалж байна...
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-status">
        <h2>{error || 'Бүтээгдэхүүн олдсонгүй.'}</h2>
        <Link to="/">Дэлгүүр рүү буцах →</Link>
      </div>
    )
  }

  return (
    <main className="product-detail-page">
      <Link to="/" className="product-detail-back">
        ← Дэлгүүр рүү буцах
      </Link>

      <div className="product-detail-layout">
        <div className="product-detail-image">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <div className="no-image">✿</div>
          )}
        </div>

        <div className="product-detail-info">
          <p className="product-category">
            {product.categories?.name || 'Бүтээгдэхүүн'}
          </p>

          <h1>{product.name}</h1>

          <p className="product-detail-price">
            {Number(product.price || 0).toLocaleString('en-US')} ₮
          </p>

          <p className="product-detail-stock">
            Үлдэгдэл: {product.stock ?? 0} ширхэг
          </p>

          {product.description && (
            <p className="product-detail-description">
              {product.description}
            </p>
          )}

          <Link to="/" className="product-detail-home-button">
            Дэлгүүрт буцах →
          </Link>
        </div>
      </div>
    </main>
  )
}

export default ProductDetail