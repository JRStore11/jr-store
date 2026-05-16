'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  addOrder,
} from '../services/firestore'

export default function JRStoreApp() {
  const [view, setView] = useState('store')
  const [adminLogged, setAdminLogged] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [adminTab, setAdminTab] = useState('dashboard')
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [copiedPix, setCopiedPix] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')

  const [storeSettings, setStoreSettings] = useState({
    storeName: 'JR Store',
    slogan: 'Keys Steam com entrega rápida',
    whatsapp: '5581984836520',
    pixKey: '+5581984836520',
    mercadoPagoToken: '',
    logoText: 'JR Store',
    primaryColor: '#00bfff',
    bannerTitle: 'Games baratos com entrega rápida via WhatsApp',
    bannerDescription:
      'Compre suas keys Steam com segurança via PIX e receba o código rapidamente diretamente no WhatsApp.',
  })

  const [games, setGames] = useState([
    {
      id: 1,
      title: 'Resident Evil 4 Remake',
      price: 119.9,
      stock: 8,
      featured: true,
      category: 'Terror',
      oldPrice: 179.9,
      image:
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Elden Ring',
      price: 149.9,
      stock: 5,
      featured: true,
      category: 'RPG',
      oldPrice: 229.9,
      image:
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Cyberpunk 2077',
      price: 99.9,
      stock: 12,
      featured: true,
      category: 'Ação',
      oldPrice: 149.9,
      image:
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 4,
      title: 'GTA V',
      price: 59.9,
      stock: 20,
      featured: true,
      category: 'Mundo Aberto',
      oldPrice: 99.9,
      image:
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1200&auto=format&fit=crop',
    },
  ])

  const [newGame, setNewGame] = useState({
    title: '',
    price: '',
    stock: '',
    image: '',
    category: 'Ação',
    oldPrice: '',
    featured: true,
  })

  const [orders, setOrders] = useState([
    {
      id: 'JR-102391',
      customer: 'Cliente Teste',
      items: '1x Elden Ring',
      total: 149.9,
      status: 'Aguardando comprovante',
      date: '15/05/2026',
    },
  ])

 useEffect(() => {
  async function loadFirebaseData() {
    try {
      const firebaseProducts = await getProducts()
      const firebaseOrders = await getOrders()

      if (firebaseProducts.length > 0) {
        setGames(firebaseProducts)
      }

      if (firebaseOrders.length > 0) {
        setOrders(firebaseOrders)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Firebase:', error)
    }
  }

  loadFirebaseData()
}, [])

  const categories = useMemo(() => ['Todos', ...new Set(games.map((game) => game.category || 'Outros'))], [games])

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'Todos' || game.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [games, searchTerm, selectedCategory])

  const formatPrice = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  )

  const cartItemsCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  )

  const orderNumber = useMemo(() => {
    return `JR-${Date.now().toString().slice(-6)}`
  }, [checkoutOpen])

  const pixCopyPaste = useMemo(() => {
    const total = cartTotal.toFixed(2)
    return `00020126360014BR.GOV.BCB.PIX0114${storeSettings.pixKey}520400005303986540${total}5802BR5910JR STORE6006RECIFE62070503***6304ABCD`
  }, [cartTotal, storeSettings.pixKey])

  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
      pixCopyPaste
    )}`
  }, [pixCopyPaste])

  function addToCart(game) {
    if (game.stock <= 0) return

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === game.id)

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === game.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentCart, { ...game, quantity: 1 }]
    })

    setIsCartOpen(true)
  }

  function removeFromCart(gameId) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== gameId))
  }

  function increaseQuantity(gameId) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === gameId ? { ...item, quantity: item.quantity + 1 } : item
      )
    )
  }

  function decreaseQuantity(gameId) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === gameId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    )
  }

  function clearCart() {
    setCart([])
  }

  function openCheckout() {
    if (cart.length === 0) return
    setIsCartOpen(false)
    setCheckoutOpen(true)
    setCopiedPix(false)
  }

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixCopyPaste)
      setCopiedPix(true)
    } catch (error) {
      setCopiedPix(false)
      alert('Não foi possível copiar automaticamente. Copie o código manualmente.')
    }
  }

  async function sendReceiptToWhatsapp() {
  const itemsText = cart
    .map((item) => `${item.quantity}x ${item.title}`)
    .join(', ')

  const message = encodeURIComponent(
    `Olá! Acabei de realizar uma compra na ${storeSettings.storeName}.\n\nPedido: ${orderNumber}\nNome: ${
      customerName || 'Cliente'
    }\nItens: ${itemsText}\nTotal: ${formatPrice(
      cartTotal
    )}\n\nSegue o comprovante do PIX para receber minha key Steam.`
  )

  const newOrder = {
    id: orderNumber,
    customer: customerName || 'Cliente',
    items: itemsText,
    total: cartTotal,
    status: 'Aguardando comprovante',
    date: new Date().toLocaleDateString('pt-BR'),
  }

  addOrder(newOrder)

  setOrders((currentOrders) => [newOrder, ...currentOrders])

  const pixResponse = await fetch('/api/create-pix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Compra JR Store',
      price: cartTotal,
      name: customerName || 'Cliente',
      email: 'cliente@email.com',
    }),
  })

  const pixData = await pixResponse.json()

  alert(
    `PIX gerado com sucesso!\n\nCódigo PIX:\n\n${
      pixData.qr_code ||
      pixData.qr_code_base64 ||
      'PIX gerado, mas o código não foi retornado.'
    }`
  )

  window.open(`https://wa.me/${storeSettings.whatsapp}?text=${message}`, '_blank')
}
  function addGame() {
    if (!newGame.title || !newGame.price) return

    const game = {
      id: Date.now(),
      title: newGame.title,
      price: Number(newGame.price),
      stock: Number(newGame.stock || 0),
      image:
        newGame.image ||
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
      category: newGame.category || 'Ação',
      oldPrice: Number(newGame.oldPrice || 0),
      featured: newGame.featured,
    }

    addProduct(game)

    setGames((currentGames) => [game, ...currentGames])
    setNewGame({ title: '', price: '', stock: '', image: '', category: 'Ação', oldPrice: '', featured: true })
  }

  function removeGame(gameId) {
    setGames((currentGames) => currentGames.filter((game) => game.id !== gameId))
  }

  function updateGame(gameId, field, value) {
    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId
          ? {
              ...game,
              [field]: field === 'price' || field === 'stock' ? Number(value) : value,
            }
          : game
      )
    )
  }

  function openOrderWhatsapp(order) {
    const message = encodeURIComponent(
      `Olá, ${order.customer}! Aqui é da JR Store. Estou entrando em contato sobre o pedido ${order.id}: ${order.items}.`
    )
    window.open(`https://wa.me/${storeSettings.whatsapp}?text=${message}`, '_blank')
  }

  function markOrderAsDelivered(orderId) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: 'Entregue' } : order
      )
    )
  }

  function AdminLogin() {
    function handleLogin() {
      if (adminPassword === 'admin123') {
        setAdminLogged(true)
        setLoginError('')
      } else {
        setLoginError('Senha incorreta. Senha provisória: admin123')
      }
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-6 text-white">
        <div className="w-full max-w-md rounded-[32px] border border-cyan-500/20 bg-[#111827] p-8 shadow-2xl">
          <h1 className="text-4xl font-black text-cyan-400">JR Admin</h1>
          <p className="mt-3 text-slate-400">
            Acesse o painel administrativo da JR Store.
          </p>

          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-bold text-slate-300">
              Senha do administrador
            </span>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              placeholder="Digite a senha"
              className="w-full rounded-2xl border border-cyan-500/20 bg-[#0b1120] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>

          {loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}

          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-2xl bg-cyan-500 px-6 py-4 text-lg font-black text-black transition hover:bg-cyan-400"
          >
            Entrar
          </button>

          <button
            onClick={() => setView('store')}
            className="mt-3 w-full rounded-2xl border border-cyan-500/20 px-6 py-4 font-bold transition hover:bg-cyan-500/10"
          >
            Voltar para loja
          </button>

          <p className="mt-5 text-xs text-slate-500">
            Esta é uma senha provisória para protótipo. Na versão real, o login será feito com Firebase Authentication.
          </p>
        </div>
      </div>
    )
  }

  function AdminPanel() {
    const adminMenu = [
      ['dashboard', 'Dashboard'],
      ['products', 'Produtos'],
      ['orders', 'Pedidos'],
      ['payments', 'PIX / Pagamentos'],
      ['appearance', 'Aparência'],
    ]

    return (
      <div className="min-h-screen bg-[#0b1120] text-white">
        <div className="flex min-h-screen">
          <aside className="hidden w-72 border-r border-cyan-500/10 bg-[#0f172a] p-6 lg:block">
            <h1 className="text-3xl font-black text-cyan-400">JR Admin</h1>
            <p className="mt-2 text-sm text-slate-400">Painel da loja</p>

            <nav className="mt-10 space-y-3">
              {adminMenu.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAdminTab(key)}
                  className={`w-full rounded-2xl px-5 py-4 text-left font-bold transition ${
                    adminTab === key
                      ? 'bg-cyan-500 text-black'
                      : 'bg-white/5 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <button
              onClick={() => setView('store')}
              className="mt-10 w-full rounded-2xl border border-cyan-500/20 px-5 py-4 font-bold transition hover:bg-cyan-500/10"
            >
              Ver Loja
            </button>

            <button
              onClick={() => {
                setAdminLogged(false)
                setAdminPassword('')
              }}
              className="mt-3 w-full rounded-2xl border border-red-500/20 px-5 py-4 font-bold text-red-300 transition hover:bg-red-500/10"
            >
              Sair do Admin
            </button>
          </aside>

          <main className="flex-1 p-4 md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-4xl font-black">Painel Administrativo</h2>
                <p className="mt-2 text-slate-400">
                  Gerencie produtos, pedidos, PIX e aparência da JR Store.
                </p>
              </div>

              <div className="flex gap-3 lg:hidden">
                <select
                  value={adminTab}
                  onChange={(event) => setAdminTab(event.target.value)}
                  className="rounded-xl border border-cyan-500/20 bg-[#111827] px-4 py-3 text-white"
                >
                  {adminMenu.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setView('store')}
                  className="rounded-xl bg-cyan-500 px-4 py-3 font-bold text-black"
                >
                  Loja
                </button>
              </div>
            </div>

            {adminTab === 'dashboard' && (
              <div>
                <div className="grid gap-6 md:grid-cols-4">
                  <AdminCard label="Produtos" value={games.length} />
                  <AdminCard label="Pedidos" value={orders.length} />
                  <AdminCard label="Estoque total" value={games.reduce((t, g) => t + g.stock, 0)} />
                  <AdminCard label="Vendas registradas" value={formatPrice(orders.reduce((t, o) => t + o.total, 0))} />
                </div>

                <div className="mt-8 rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Resumo</h3>
                  <p className="mt-3 text-slate-300">
                    Seu painel já permite cadastrar jogos, editar preços, controlar estoque, configurar PIX/WhatsApp e visualizar pedidos.
                  </p>
                </div>
              </div>
            )}

            {adminTab === 'products' && (
              <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Adicionar jogo</h3>

                  <div className="mt-6 space-y-4">
                    <AdminInput label="Nome do jogo" value={newGame.title} onChange={(v) => setNewGame({ ...newGame, title: v })} />
                    <AdminInput label="Preço" type="number" value={newGame.price} onChange={(v) => setNewGame({ ...newGame, price: v })} />
                    <AdminInput label="Estoque de keys" type="number" value={newGame.stock} onChange={(v) => setNewGame({ ...newGame, stock: v })} />
                    <AdminInput label="Categoria" value={newGame.category} onChange={(v) => setNewGame({ ...newGame, category: v })} />
                    <AdminInput label="Preço antigo/promocional" type="number" value={newGame.oldPrice} onChange={(v) => setNewGame({ ...newGame, oldPrice: v })} />
                    <AdminInput label="URL da imagem/capa" value={newGame.image} onChange={(v) => setNewGame({ ...newGame, image: v })} />

                    <button
                      onClick={addGame}
                      className="w-full rounded-2xl bg-cyan-500 px-6 py-4 font-black text-black transition hover:bg-cyan-400"
                    >
                      Cadastrar jogo
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Jogos cadastrados</h3>

                  <div className="mt-6 space-y-4">
                    {games.map((game) => (
                      <div key={game.id} className="rounded-2xl bg-white/5 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center">
                          <img src={game.image} alt={game.title} className="h-20 w-20 rounded-xl object-cover" />

                          <div className="grid flex-1 gap-3 md:grid-cols-4">
                            <input
                              value={game.title}
                              onChange={(event) => updateGame(game.id, 'title', event.target.value)}
                              className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                            />
                            <input
                              type="number"
                              value={game.price}
                              onChange={(event) => updateGame(game.id, 'price', event.target.value)}
                              className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                            />
                            <input
                              type="number"
                              value={game.stock}
                              onChange={(event) => updateGame(game.id, 'stock', event.target.value)}
                              className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                            />
                            <input
                              value={game.category || ''}
                              onChange={(event) => updateGame(game.id, 'category', event.target.value)}
                              className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                            />
                          </div>

                          <button
                            onClick={() => removeGame(game.id)}
                            className="rounded-xl bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/20"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'orders' && (
              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">Pedidos</h3>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="p-4">Pedido</th>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Itens</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-t border-cyan-500/10">
                          <td className="p-4 font-bold text-cyan-400">{order.id}</td>
                          <td className="p-4">{order.customer}</td>
                          <td className="p-4 text-slate-300">{order.items}</td>
                          <td className="p-4">{formatPrice(order.total)}</td>
                          <td className="p-4">
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openOrderWhatsapp(order)}
                                className="rounded-xl border border-cyan-500/20 px-4 py-2 font-bold hover:bg-cyan-500/10"
                              >
                                WhatsApp
                              </button>
                              <button
                                onClick={() => markOrderAsDelivered(order.id)}
                                className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black hover:bg-cyan-400"
                              >
                                Entregue
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === 'payments' && (
              <div className="grid gap-8 xl:grid-cols-2">
                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">PIX</h3>
                  <div className="mt-6 space-y-4">
                    <AdminInput label="Chave PIX" value={storeSettings.pixKey} onChange={(v) => setStoreSettings({ ...storeSettings, pixKey: v })} />
                    <AdminInput label="WhatsApp da loja" value={storeSettings.whatsapp} onChange={(v) => setStoreSettings({ ...storeSettings, whatsapp: v })} />
                  </div>
                </div>

                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Mercado Pago</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Na versão real, o token ficará salvo com segurança no backend, nunca diretamente no navegador.
                  </p>
                  <div className="mt-6 space-y-4">
                    <AdminInput label="Access Token Mercado Pago" value={storeSettings.mercadoPagoToken} onChange={(v) => setStoreSettings({ ...storeSettings, mercadoPagoToken: v })} />
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'appearance' && (
              <div className="grid gap-8 xl:grid-cols-2">
                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Identidade da loja</h3>
                  <div className="mt-6 space-y-4">
                    <AdminInput label="Nome da loja" value={storeSettings.storeName} onChange={(v) => setStoreSettings({ ...storeSettings, storeName: v, logoText: v })} />
                    <AdminInput label="Slogan" value={storeSettings.slogan} onChange={(v) => setStoreSettings({ ...storeSettings, slogan: v })} />
                    <AdminInput label="Título do banner" value={storeSettings.bannerTitle} onChange={(v) => setStoreSettings({ ...storeSettings, bannerTitle: v })} />
                    <AdminInput label="Descrição do banner" value={storeSettings.bannerDescription} onChange={(v) => setStoreSettings({ ...storeSettings, bannerDescription: v })} />
                  </div>
                </div>

                <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                  <h3 className="text-2xl font-black text-cyan-400">Prévia</h3>
                  <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-[#0b1120] p-8">
                    <h4 className="text-4xl font-black text-cyan-400">{storeSettings.storeName}</h4>
                    <p className="mt-2 text-slate-400">{storeSettings.slogan}</p>
                    <h5 className="mt-8 text-3xl font-black">{storeSettings.bannerTitle}</h5>
                    <p className="mt-3 text-slate-300">{storeSettings.bannerDescription}</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  }

  function AdminCard({ label, value }) {
    return (
      <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <strong className="mt-3 block text-3xl font-black text-cyan-400">{value}</strong>
      </div>
    )
  }

  function AdminInput({ label, value, onChange, type = 'text' }) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-300">{label}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-cyan-500/20 bg-[#0b1120] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        />
      </label>
    )
  }

  if (view === 'admin') {
    return adminLogged ? <AdminPanel /> : <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#0b1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-black tracking-wide text-cyan-400">
              {storeSettings.storeName}
            </h1>
            <p className="text-sm text-slate-400">{storeSettings.slogan}</p>
          </div>

          <nav className="hidden gap-8 text-sm font-medium md:flex">
            <a className="transition hover:text-cyan-400" href="#">
              Início
            </a>
            <a className="transition hover:text-cyan-400" href="#catalogo">
              Promoções
            </a>
            <a className="transition hover:text-cyan-400" href="#catalogo">
              Steam
            </a>
            <button onClick={() => setView('admin')} className="transition hover:text-cyan-400">
              Admin
            </button>
          </nav>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-black transition hover:scale-105 hover:bg-cyan-400"
          >
            Carrinho
            {cartItemsCount > 0 && (
              <span className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-cyan-600">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm">
          <aside className="ml-auto flex h-full w-full max-w-md flex-col border-l border-cyan-500/20 bg-[#0f172a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/10 p-6">
              <div>
                <h2 className="text-2xl font-black text-cyan-400">Seu Carrinho</h2>
                <p className="text-sm text-slate-400">
                  {cartItemsCount} item(ns) selecionado(s)
                </p>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="rounded-xl border border-cyan-500/20 px-4 py-2 text-sm font-bold transition hover:bg-cyan-500/10"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-5 rounded-full bg-cyan-500/10 p-8 text-5xl">🛒</div>
                  <h3 className="text-xl font-bold">Seu carrinho está vazio</h3>
                  <p className="mt-2 text-slate-400">
                    Adicione algum jogo Steam para continuar.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-cyan-500/10 bg-[#111827] p-4"
                    >
                      <div className="flex gap-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-20 w-20 rounded-xl object-cover"
                        />

                        <div className="flex-1">
                          <h3 className="font-bold">{item.title}</h3>
                          <p className="mt-1 text-cyan-400">
                            {formatPrice(item.price)}
                          </p>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center rounded-xl border border-cyan-500/20">
                              <button
                                onClick={() => decreaseQuantity(item.id)}
                                className="px-3 py-1 text-lg font-bold hover:text-cyan-400"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 font-bold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => increaseQuantity(item.id)}
                                className="px-3 py-1 text-lg font-bold hover:text-cyan-400"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-sm font-bold text-red-400 hover:text-red-300"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-cyan-500/10 p-6">
              <div className="mb-5 flex items-center justify-between text-lg">
                <span className="text-slate-300">Total</span>
                <strong className="text-3xl text-cyan-400">
                  {formatPrice(cartTotal)}
                </strong>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={openCheckout}
                className="w-full rounded-2xl bg-cyan-500 px-6 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                Gerar PIX
              </button>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="mt-3 w-full rounded-2xl border border-cyan-500/20 px-6 py-3 font-bold transition hover:bg-cyan-500/10"
                >
                  Limpar carrinho
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[32px] border border-cyan-500/20 bg-[#0f172a] shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-cyan-500/10 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-black text-cyan-400">Pagamento via PIX</h2>
                <p className="mt-1 text-slate-400">Pedido {orderNumber}</p>
              </div>

              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-xl border border-cyan-500/20 px-4 py-2 text-sm font-bold transition hover:bg-cyan-500/10"
              >
                Voltar para loja
              </button>
            </div>

            <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-xl font-black">Resumo da compra</h3>

                <div className="mt-5 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4"
                    >
                      <div>
                        <h4 className="font-bold">{item.title}</h4>
                        <p className="text-sm text-slate-400">
                          {item.quantity}x {formatPrice(item.price)}
                        </p>
                      </div>

                      <strong className="text-cyan-400">
                        {formatPrice(item.price * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <strong className="text-4xl text-cyan-400">
                      {formatPrice(cartTotal)}
                    </strong>
                  </div>
                </div>

                <label className="mt-6 block">
                  <span className="mb-2 block text-sm font-bold text-slate-300">
                    Seu nome para identificação do pedido
                  </span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Digite seu nome"
                    className="w-full rounded-2xl border border-cyan-500/20 bg-[#0b1120] px-5 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6 text-center">
                <h3 className="text-xl font-black">Escaneie o QR Code</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Pague pelo app do seu banco e depois envie o comprovante.
                </p>

                <div className="mx-auto mt-6 w-fit rounded-3xl bg-white p-4">
                  <img src={qrCodeUrl} alt="QR Code PIX" className="h-64 w-64" />
                </div>

                <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-[#0b1120] p-4 text-left">
                  <p className="mb-2 text-sm font-bold text-slate-300">PIX copia e cola</p>
                  <p className="break-all text-xs text-slate-400">{pixCopyPaste}</p>
                </div>

                <button
                  onClick={copyPixCode}
                  className="mt-4 w-full rounded-2xl bg-cyan-500 px-6 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-cyan-400"
                >
                  {copiedPix ? 'Código PIX copiado!' : 'Copiar código PIX'}
                </button>

                <button
                  onClick={sendReceiptToWhatsapp}
                  className="mt-3 w-full rounded-2xl border border-cyan-500/30 bg-white/5 px-6 py-4 text-lg font-black transition hover:border-cyan-400 hover:bg-cyan-500/10"
                >
                  Já paguei — enviar comprovante
                </button>

                <p className="mt-4 text-xs text-slate-500">
                  Observação: este QR Code é um modelo visual. Na versão publicada, ele deve ser gerado oficialmente via Mercado Pago ou Asaas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden border-b border-cyan-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent" />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
              Loja Oficial de Keys Steam
            </span>

            <h2 className="mt-6 text-5xl font-black leading-tight">
              {storeSettings.bannerTitle}
            </h2>

            <p className="mt-6 max-w-xl text-lg text-slate-300">
              {storeSettings.bannerDescription}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#catalogo"
                className="rounded-2xl bg-cyan-500 px-8 py-4 text-lg font-bold text-black transition hover:scale-105 hover:bg-cyan-400"
              >
                Ver Catálogo
              </a>

              <a
                href="#catalogo"
                className="rounded-2xl border border-cyan-500/30 bg-white/5 px-8 py-4 text-lg font-bold transition hover:border-cyan-400 hover:bg-cyan-500/10"
              >
                Promoções
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[40px] bg-cyan-500/20 blur-3xl" />

            <img
              className="relative rounded-[40px] border border-cyan-500/20 shadow-2xl"
              src="https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=1400&auto=format&fit=crop"
              alt="Banner gamer"
            />
          </div>
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-black">Catálogo Steam</h3>
            <p className="mt-2 text-slate-400">
              Busque jogos, promoções e keys disponíveis
            </p>
          </div>

          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('Todos')
            }}
            className="rounded-xl border border-cyan-500/20 bg-white/5 px-5 py-3 transition hover:border-cyan-400 hover:bg-cyan-500/10"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar jogo Steam..."
            className="rounded-2xl border border-cyan-500/20 bg-[#111827] px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
          />

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-2xl border border-cyan-500/20 bg-[#111827] px-5 py-4 text-white outline-none focus:border-cyan-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="group overflow-hidden rounded-3xl border border-cyan-500/10 bg-[#111827] transition hover:-translate-y-2 hover:border-cyan-400/40"
            >
              <div className="overflow-hidden">
                <img
                  src={game.image}
                  alt={game.title}
                  className="h-64 w-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {game.category || 'Steam Key'}
                  </span>

                  <span className="text-sm text-slate-400">
                    {game.stock > 0 ? `${game.stock} keys` : 'Esgotado'}
                  </span>
                </div>

                <h4 className="text-xl font-bold">{game.title}</h4>

                <div className="mt-5 flex items-center justify-between">
                  <span>
                    {game.oldPrice > game.price && (
                      <span className="block text-sm text-slate-500 line-through">
                        {formatPrice(game.oldPrice)}
                      </span>
                    )}
                    <span className="text-2xl font-black text-cyan-400">
                      {formatPrice(game.price)}
                    </span>
                  </span>

                  <button
                    disabled={game.stock <= 0}
                    onClick={() => addToCart(game)}
                    className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-10 text-center">
            <h4 className="text-2xl font-black text-cyan-400">Nenhum jogo encontrado</h4>
            <p className="mt-2 text-slate-400">Tente buscar por outro nome ou categoria.</p>
          </div>
        )}
      </section>

      <section className="border-y border-cyan-500/10 bg-[#0f172a]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3">
          <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-8">
            <h4 className="text-2xl font-black text-cyan-400">Pagamento PIX</h4>
            <p className="mt-4 text-slate-300">
              Gere QR Code automaticamente e pague rapidamente.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-8">
            <h4 className="text-2xl font-black text-cyan-400">
              Entrega via WhatsApp
            </h4>
            <p className="mt-4 text-slate-300">
              Após o pagamento você é redirecionado para atendimento imediato.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-8">
            <h4 className="text-2xl font-black text-cyan-400">
              Keys Originais
            </h4>
            <p className="mt-4 text-slate-300">
              Trabalhamos apenas com keys Steam legítimas e seguras.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-500/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center text-slate-400 md:flex-row md:text-left">
          <div>
            <h5 className="text-2xl font-black text-cyan-400">{storeSettings.storeName}</h5>
            <p className="mt-2">© 2026 Todos os direitos reservados.</p>
          </div>

          <div>
            <p>WhatsApp: (81) 98483-6520</p>
            <p>Atendimento rápido e seguro.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
