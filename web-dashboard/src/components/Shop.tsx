import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Crown, Sparkles, Lock, CreditCard, Landmark } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  name: string
  description: string
  image_url: string | null
  category: string
  prices: { id: string; unit_amount: number; type: string; interval?: string }[]
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<string[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [provider, setProvider] = useState<'stripe' | 'razorpay'>('stripe')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return

    const { data: prods } = await supabase.from('products').select('*, prices(*)').eq('active', true)
    const { data: inv } = await supabase.from('user_inventory').select('product_id').eq('user_id', user.id)
    const { data: profile } = await supabase.from('profiles').select('is_premium, payment_provider').eq('id', user.id).single()

    setProducts(prods || [])
    setInventory(inv?.map((i: any) => i.product_id) || [])
    setIsPremium(profile?.is_premium || false)
    setProvider(profile?.payment_provider || 'stripe')
    setLoading(false)
  }

  const buyStripe = async (priceId: string, productId: string, mode: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { price_id: priceId, product_id: productId, mode },
    })
    if (error) { alert('Checkout failed: ' + error.message); return }
    window.location.href = data.url
  }

  const buyRazorpay = async (priceId: string, productId: string) => {
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
      body: { price_id: priceId, product_id: productId },
    })
    if (error) { alert('Order creation failed: ' + error.message); return }

    // Load Razorpay checkout
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => {
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'DevPet',
        description: 'Digital Pet Upgrade',
        order_id: data.order_id,
        handler: (_response: any) => {
          alert('Payment successful! Your item will be added shortly.')
          window.location.reload()
        },
        prefill: { name: '', email: '' },
        theme: { color: '#7c3aed' },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    }
    document.body.appendChild(script)
  }

  const equip = async (productId: string, category: string) => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    const field = category === 'skin' ? 'equipped_skin' : 'equipped_badge'
    await supabase.from('profiles').update({ [field]: productId }).eq('id', user.id)
    alert('Equipped!')
  }

  const switchProvider = async (newProvider: 'stripe' | 'razorpay') => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    await supabase.from('profiles').update({ payment_provider: newProvider }).eq('id', user.id)
    setProvider(newProvider)
  }

  if (loading) return <div style={{ padding: 40 }}>Loading shop...</div>

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <ShoppingBag size={28} />
        <h1 style={{ fontSize: '28px' }}>DevPet Shop</h1>
        {isPremium && (
          <span style={{ background: 'linear-gradient(90deg, #ffd700, #ff6b35)', color: '#000', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Crown size={14} /> PRO
          </span>
        )}
      </div>

      {/* Payment Provider Toggle */}
      <div className="glass" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Payment Provider:</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={provider === 'stripe' ? 'btn' : 'btn btn-outline'}
            onClick={() => switchProvider('stripe')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <CreditCard size={14} /> Stripe (Global)
          </button>
          <button
            className={provider === 'razorpay' ? 'btn' : 'btn btn-outline'}
            onClick={() => switchProvider('razorpay')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Landmark size={14} /> Razorpay (India)
          </button>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
          {provider === 'stripe' ? 'USD pricing • Cards, PayPal, Apple Pay' : 'INR pricing • UPI, Cards, NetBanking'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {products.map((product) => {
          const owned = inventory.includes(product.id)
          const price = product.prices[0]
          const isSub = product.category === 'subscription'
          const displayAmount = provider === 'razorpay' ? `₹${Math.round(price.unit_amount * 83)}` : `$${(price.unit_amount / 100).toFixed(2)}`

          return (
            <motion.div
              key={product.id}
              whileHover={{ y: -4 }}
              className="glass"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ height: '160px', background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(255,107,53,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '64px' }}>
                  {product.category === 'skin' ? '🎨' : product.category === 'badge' ? '🏅' : '👑'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '18px' }}>{product.name}</h3>
                {owned && !isSub && (
                  <span style={{ background: 'var(--success)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>OWNED</span>
                )}
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {product.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {displayAmount}
                  {price.interval && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/{price.interval}</span>}
                </div>

                {owned && !isSub ? (
                  <button className="btn btn-outline" onClick={() => equip(product.id, product.category)}>
                    <Sparkles size={14} /> Equip
                  </button>
                ) : isSub && isPremium ? (
                  <span style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 500 }}>Active ✓</span>
                ) : (
                  <button
                    className="btn"
                    onClick={() => provider === 'stripe'
                      ? buyStripe(price.id, product.id, isSub ? 'subscription' : 'payment')
                      : buyRazorpay(price.id, product.id)
                    }
                  >
                    {isSub ? <Crown size={14} /> : <Lock size={14} />}
                    {isSub ? 'Subscribe' : 'Buy'}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}