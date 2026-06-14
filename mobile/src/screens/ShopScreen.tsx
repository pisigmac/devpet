import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Modal } from 'react-native';
import { supabase } from '../lib/supabase';
import { Crown, Sparkles, CreditCard, Landmark } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  prices: { id: string; unit_amount: number; type: string; interval?: string }[];
}

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [provider, setProvider] = useState<'stripe' | 'razorpay'>('stripe');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: prods } = await supabase.from('products').select('*, prices(*)').eq('active', true);
    const { data: inv } = await supabase.from('user_inventory').select('product_id').eq('user_id', user.id);
    const { data: profile } = await supabase.from('profiles').select('is_premium, payment_provider').eq('id', user.id).single();

    setProducts(prods || []);
    setInventory(inv?.map(i => i.product_id) || []);
    setIsPremium(profile?.is_premium || false);
    setProvider(profile?.payment_provider || 'stripe');
  }

  async function buyStripe(priceId: string, productId: string, mode: string) {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { price_id: priceId, product_id: productId, mode },
    });
    if (error) { Alert.alert('Error', error.message); return; }
    if (data?.url) setCheckoutUrl(data.url);
  }

  async function buyRazorpay(priceId: string, productId: string) {
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
      body: { price_id: priceId, product_id },
    });
    if (error) { Alert.alert('Error', error.message); return; }

    // For React Native, we use a WebView or native Razorpay SDK
    // Here we construct a checkout URL for WebView
    const checkoutHTML = `
      <!DOCTYPE html>
      <html>
      <head><script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
      <body>
        <script>
          var options = {
            key: "${data.key_id}",
            amount: ${data.amount},
            currency: "${data.currency}",
            name: "DevPet",
            description: "Digital Pet Upgrade",
            order_id: "${data.order_id}",
            handler: function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id
              }));
            },
            theme: { color: "#7c3aed" }
          };
          var rzp = new Razorpay(options);
          rzp.open();
        </script>
      </body>
      </html>
    `;

    // In production, use react-native-razorpay package instead
    Alert.alert(
      'Razorpay Checkout',
      'Complete payment in browser?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay', onPress: () => {
          // Open in browser or use WebView
          setCheckoutUrl(`data:text/html,${encodeURIComponent(checkoutHTML)}`);
        }}
      ]
    );
  }

  async function equip(productId: string, category: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const field = category === 'skin' ? 'equipped_skin' : 'equipped_badge';
    await supabase.from('profiles').update({ [field]: productId }).eq('id', user.id);
    Alert.alert('Equipped!', `Your pet now wears ${productId}`);
  }

  async function switchProvider(newProvider: 'stripe' | 'razorpay') {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from('profiles').update({ payment_provider: newProvider }).eq('id', user.id);
    setProvider(newProvider);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Text style={styles.title}>🛒 DevPet Shop</Text>
        {isPremium && (
          <View style={styles.proBadge}>
            <Crown size={12} color="#000" />
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Provider Toggle */}
      <View style={styles.providerBar}>
        <Text style={styles.providerLabel}>Payment:</Text>
        <TouchableOpacity
          style={[styles.providerBtn, provider === 'stripe' && styles.providerActive]}
          onPress={() => switchProvider('stripe')}
        >
          <CreditCard size={14} color={provider === 'stripe' ? '#fff' : '#94a3b8'} />
          <Text style={[styles.providerText, provider === 'stripe' && styles.providerTextActive]}>Stripe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.providerBtn, provider === 'razorpay' && styles.providerActive]}
          onPress={() => switchProvider('razorpay')}
        >
          <Landmark size={14} color={provider === 'razorpay' ? '#fff' : '#94a3b8'} />
          <Text style={[styles.providerText, provider === 'razorpay' && styles.providerTextActive]}>Razorpay</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {products.map(product => {
          const owned = inventory.includes(product.id);
          const price = product.prices[0];
          const isSub = product.category === 'subscription';
          const displayAmount = provider === 'razorpay'
            ? `₹${Math.round(price.unit_amount * 83)}`
            : `$${(price.unit_amount / 100).toFixed(2)}`;

          return (
            <View key={product.id} style={styles.card}>
              <View style={styles.iconBox}>
                <Text style={styles.icon}>
                  {product.category === 'skin' ? '🎨' : product.category === 'badge' ? '🏅' : '👑'}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardDesc}>{product.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.price}>
                  {displayAmount}
                  {price.interval && <Text style={styles.interval}>/{price.interval}</Text>}
                </Text>
                {owned && !isSub ? (
                  <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => equip(product.id, product.category)}>
                    <Sparkles size={14} color="#7c3aed" />
                    <Text style={styles.btnOutlineText}>Equip</Text>
                  </TouchableOpacity>
                ) : isSub && isPremium ? (
                  <Text style={styles.activeText}>Active ✓</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => provider === 'stripe'
                      ? buyStripe(price.id, product.id, isSub ? 'subscription' : 'payment')
                      : buyRazorpay(price.id, product.id)
                    }
                  >
                    <Text style={styles.btnText}>{isSub ? 'Subscribe' : 'Buy'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Checkout WebView Modal */}
      <Modal visible={!!checkoutUrl} animationType="slide">
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ padding: 16, backgroundColor: '#0f0f1a' }}
            onPress={() => setCheckoutUrl(null)}
          >
            <Text style={{ color: '#f8fafc', fontSize: 16 }}>✕ Close</Text>
          </TouchableOpacity>
          {checkoutUrl && (
            <WebView source={{ uri: checkoutUrl }} style={{ flex: 1 }}
              onMessage={(e) => {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.status === 'success') {
                  Alert.alert('Payment Successful!', 'Your purchase is being processed.');
                  setCheckoutUrl(null);
                  fetchData();
                }
              }}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffd700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  proText: { fontSize: 11, fontWeight: '700', color: '#000' },
  providerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  providerLabel: { color: '#94a3b8', fontSize: 14, marginRight: 8 },
  providerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  providerActive: { backgroundColor: '#7c3aed' },
  providerText: { color: '#94a3b8', fontSize: 13 },
  providerTextActive: { color: '#fff', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconBox: { height: 80, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 32 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#f8fafc', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 12, minHeight: 36 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  interval: { fontSize: 12, color: '#94a3b8' },
  btn: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7c3aed', flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnOutlineText: { color: '#7c3aed', fontSize: 12, fontWeight: '600' },
  activeText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
});
