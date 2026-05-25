'use client'

import { useEffect, useMemo, useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
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
  const [adminEmail, setAdminEmail] = useState('admin2@jrstore.com')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [adminTab, setAdminTab] = useState('dashboard')

  const [games, setGames] = useState([])
  const [orders, setOrders] = useState([])
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [pixData, setPixData] = useState(null)
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
      'Compre suas keys Steam com segurança via PIX e receba rapidamente direto no WhatsApp.',
  })

  const [newGame, setNewGame] = useState({
    title: '',
    price: '',
    stock: '',
    image: '',
    category: 'Ação',
    oldPrice: '',
    featured: true,
  })

  useEffect(() => {
    async function loadFirebaseData() {
      try {
        const firebaseProducts = await getProducts()
        const firebaseOrders = await getOrders()

        setGames(firebaseProducts || [])
        setOrders(firebaseOrders || [])
      } catch (error) {
        console.error('Erro ao carregar Firebase:', error)
      }
    }

    loadFirebaseData()
  }, [])

  const categories = useMemo(() => {
    return ['Todos', ...new Set(games.map((game) => game.category || 'Outros'))]
  }, [games])

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === 'Todos' || game.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [games, searchTerm, selectedCategory])

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.price) * Number(item.quantity),
      0
    )
  }, [cart])

  const cartItemsCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }, [cart])

  const formatPrice = (price) =>
    Number(price || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  function addToCart(game) {
    if (Number(game.stock) <= 0) return

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

  async function handleDeleteProduct(id) {
    try {
      const confirmDelete = confirm('Tem certeza que deseja excluir este produto?')
      if (!confirmDelete) return

      await deleteProduct(String(id))

      const updatedProducts = await getProducts()
      setGames(updatedProducts)
    } catch (error) {
      console.error(error)
      alert(`Erro ao excluir produto: ${error.message}`)
    }
  }

  async function openCheckout() {
    if (cart.length === 0) return

    setIsCartOpen(false)
    setCheckoutOpen(true)
    setCopiedPix(false)

    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: cartTotal,
          title: 'Compra JR Store',
          name: customerName || 'Cliente',
          email: 'cliente@email.com',
        }),
      })

      const data = await response.json()
      setPixData(data)
    } catch (error) {
      console.error(error)
      setPixData({
        qr_code:
          '00020126580014BR.GOV.BCB.PIX0136' +
          storeSettings.pixKey +
          '520400005303986540' +
          cartTotal.toFixed(2).replace('.', '') +
          '5802BR5920JR STORE6009RECIFE62070503***6304ABCD',
        qr_code_base64: '',
      })
    }
  }

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixData?.qr_code || '')
      setCopiedPix(true)
    } catch (error) {
      console.error(error)
    }
  }

  async function sendReceiptToWhatsapp() {
    const orderId = `JR-${Date.now().toString().slice(-6)}`

    const newOrder = {
      id: orderId,
      customerName: customerName || 'Cliente',
      game: cart.map((item) => item.title).join(', '),
      price: cartTotal,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    }

    await addOrder(newOrder)
    setOrders((currentOrders) => [newOrder, ...currentOrders])

    const message = encodeURIComponent(
      `Olá! Fiz uma compra na JR Store.\n\nPedido: ${orderId}\nCliente: ${
        customerName || 'Cliente'
      }\nItens: ${cart.map((item) => `${item.title} x${item.quantity}`).join(', ')}\nTotal: ${formatPrice(
        cartTotal
      )}\n\nVou enviar o comprovante do PIX.`
    )

    window.open(`https://wa.me/${storeSettings.whatsapp}?text=${message}`, '_blank')
  }

  async function addGame() {
    if (!newGame.title || !newGame.price) return

    const game = {
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

    if (newGame.id) {
      await updateProduct(newGame.id, game)

      const updatedProducts = await getProducts()
      setGames(updatedProducts)
    } else {
      const productId = await addProduct(game)

      setGames((currentGames) => [{ ...game, id: productId }, ...currentGames])
    }

    setNewGame({
      title: '',
      price: '',
      stock: '',
      image: '',
      category: 'Ação',
      oldPrice: '',
      featured: true,
    })
  }

  async function updateGame(gameId, field, value) {
    const parsedValue =
      field === 'price' || field === 'stock' || field === 'oldPrice'
        ? Number(value)
        : value

    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId ? { ...game, [field]: parsedValue } : game
      )
    )

    await updateProduct(gameId, { [field]: parsedValue })
  }

  function markOrderAsDelivered(orderId) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: 'Entregue' } : order
      )
    )
  }

  async function handleLogin() {
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
      setAdminLogged(true)
      setLoginError('')
    } catch (error) {
      console.error(error)
      setLoginError('E-mail ou senha incorretos.')
    }
  }

  async function handleLogout() {
    await signOut(auth)
    setAdminLogged(false)
    setView('store')
  }

  function ProductCard({ game }) {
    return (
      <div
        key={game.id}
        className="group animate-[fadeInUp_0.6s_ease-out] overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#111827] to-[#070b14] shadow-lg shadow-purple-900/30 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-500/30"
      >
        <div className="relative bg-black">
          {game.oldPrice > game.price && (
          <div className="absolute left-2 top-2 z-10 rounded-md bg-red-500 px-1.5 py-0.5 text-[8px] font-black text-white shadow-lg">
            🔥 PROMOÇÃO
          </div>
        )}

        {game.featured && (
          <div className="absolute right-2 top-2 z-10 rounded-md bg-purple-600 px-1.5 py-0.5 text-[8px] font-black text-white shadow-lg">
            ⭐ MAIS VENDIDO
          </div>
        )}
        
          <img
            src={game.image}
            alt={game.title}
            className="h-[170px] w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="p-2.5">
          <span className="mb-2 inline-flex rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-bold text-white">
            🔑 Chave Steam
          </span>

          <h3 className="min-h-[34px] text-[12px] font-black leading-tight text-white">
            {game.title}
          </h3>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xl font-black text-white">
                {formatPrice(game.price)}
              </p>
              <p className="text-sm text-slate-400">À vista no Pix</p>
              <p className="mt-1 text-xs text-purple-300">
                Estoque: {game.stock} keys
              </p>
            </div>

           <div className="flex items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-lg text-emerald-400">
  ❖
          </div>
            </div>

          <button
            disabled={Number(game.stock) <= 0}
            onClick={() => addToCart(game)}
            className="mt-2 w-full rounded-xl bg-purple-600 px-2 py-2 text-[12px] font-black text-white transition-all duration-300 hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🛒 Comprar agora
          </button>

          {adminLogged && view === 'admin' && (
            <button
              onClick={() => {
                setNewGame({
                  title: game.title || '',
                  price: game.price || '',
                  stock: game.stock || '',
                  image: game.image || '',
                  category: game.category || 'Ação',
                  oldPrice: game.oldPrice || '',
                  featured: game.featured || false,
                  id: game.id,
                })
                setAdminTab('products')
              }}
              className="mt-2 w-full rounded-xl bg-yellow-400 px-4 py-2 font-bold text-black hover:bg-yellow-300"
            >
              Editar
            </button>
          )}

          {adminLogged && view === 'admin' && (
            <button
              onClick={() => handleDeleteProduct(game.id)}
              className="mt-2 w-full rounded-xl bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    )
  }

  function AdminLogin() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050008] px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-[#100018] p-8 shadow-2xl">
          <h1 className="text-4xl font-black text-purple-400">JR Admin</h1>
          <p className="mt-3 text-slate-400">
            Acesse o painel administrativo da JR Store.
          </p>

          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-bold text-slate-300">
              E-mail do administrador
            </span>
            <input
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              className="w-full rounded-2xl border border-purple-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-purple-400"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-slate-300">
              Senha do administrador
            </span>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="w-full rounded-2xl border border-purple-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-purple-400"
            />
          </label>

          {loginError && (
            <p className="mt-4 text-sm font-bold text-red-400">{loginError}</p>
          )}

          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-2xl bg-purple-500 px-6 py-4 text-lg font-black text-black hover:bg-purple-400"
          >
            Entrar
          </button>

          <button
            onClick={() => setView('store')}
            className="mt-3 w-full rounded-2xl border border-purple-500/30 px-6 py-4 font-bold text-white hover:border-cyan-400"
          >
            Voltar para loja
          </button>
        </div>
      </div>
    )
  }

  function AdminPanel() {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a0826_0%,#050008_45%,#020204_100%)] text-white">
        <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-purple-500/10 bg-[#030712] p-6 lg:block">
          <h1 className="text-3xl font-black text-purple-400">JR Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Painel administrativo</p>

          <nav className="mt-8 space-y-3">
            <AdminTabButton label="Dashboard" tab="dashboard" />
            <AdminTabButton label="Produtos" tab="products" />
            <AdminTabButton label="Pedidos" tab="orders" />
            <AdminTabButton label="Pagamento" tab="payment" />
            <AdminTabButton label="Aparência" tab="appearance" />
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded-2xl bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-600"
          >
            Sair
          </button>

          <button
            onClick={() => setView('store')}
            className="mt-3 w-full rounded-2xl border border-purple-500/30 px-4 py-3 font-bold text-white hover:border-cyan-400"
          >
            Ver loja
          </button>
        </aside>

        <main className="p-6 lg:ml-72">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-purple-400">
                Painel Admin
              </h2>
              <p className="mt-2 text-slate-400">
                Gerencie produtos, pedidos e aparência da loja.
              </p>
            </div>

            <div className="flex gap-2 lg:hidden">
              {['dashboard', 'products', 'orders', 'payment', 'appearance'].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                    className="rounded-xl border border-purple-500/20 px-3 py-2 text-xs"
                  >
                    {tab}
                  </button>
                )
              )}
            </div>
          </div>

          {adminTab === 'dashboard' && (
            <div>
              <div className="grid gap-6 md:grid-cols-4">
                <AdminCard label="Produtos" value={games.length} />
                <AdminCard label="Pedidos" value={orders.length} />
                <AdminCard
                  label="Estoque total"
                  value={games.reduce(
                    (total, game) => total + Number(game.stock || 0),
                    0
                  )}
                />
                <AdminCard
                  label="Vendas registradas"
                  value={formatPrice(
                    orders.reduce(
                      (total, order) => total + Number(order.price || 0),
                      0
                    )
                  )}
                />
              </div>

              <div className="mt-8 rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">Resumo</h3>
                <p className="mt-3 text-slate-300">
                  Seu painel permite cadastrar jogos, editar preços, controlar
                  estoque, configurar PIX/WhatsApp e visualizar pedidos.
                </p>
              </div>
            </div>
          )}

          {adminTab === 'products' && (
            <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">
                  {newGame.id ? 'Editar jogo' : 'Adicionar jogo'}
                </h3>

                <div className="mt-6 space-y-4">
                  <AdminInput
                    label="Nome do jogo"
                    value={newGame.title}
                    onChange={(v) => setNewGame({ ...newGame, title: v })}
                  />
                  <AdminInput
                    label="Preço"
                    type="number"
                    value={newGame.price}
                    onChange={(v) => setNewGame({ ...newGame, price: v })}
                  />
                  <AdminInput
                    label="Estoque de keys"
                    type="number"
                    value={newGame.stock}
                    onChange={(v) => setNewGame({ ...newGame, stock: v })}
                  />
                  <AdminInput
                    label="URL da imagem"
                    value={newGame.image}
                    onChange={(v) => setNewGame({ ...newGame, image: v })}
                  />
                  <AdminInput
                    label="Categoria"
                    value={newGame.category}
                    onChange={(v) => setNewGame({ ...newGame, category: v })}
                  />
                  <AdminInput
                    label="Preço antigo"
                    type="number"
                    value={newGame.oldPrice}
                    onChange={(v) => setNewGame({ ...newGame, oldPrice: v })}
                  />

                  <button
                    onClick={addGame}
                    className="w-full rounded-2xl bg-purple-500 px-6 py-4 font-black text-black transition hover:bg-purple-400"
                  >
                    {newGame.id ? 'Salvar alterações' : 'Cadastrar jogo'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">
                  Jogos cadastrados
                </h3>

                <div className="mt-6 space-y-4">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex flex-col gap-4 rounded-2xl bg-white/5 p-4 md:flex-row md:items-center"
                    >
                      <img
                        src={game.image}
                        alt={game.title}
                        className="h-24 w-20 rounded-xl object-cover"
                      />

                      <div className="grid flex-1 gap-3 md:grid-cols-3">
                        <input
                          value={game.title}
                          onChange={(event) =>
                            updateGame(game.id, 'title', event.target.value)
                          }
                          className="rounded-xl border border-purple-500/20 bg-[#100018] px-4 py-3 outline-none focus:border-purple-400"
                        />

                        <input
                          type="number"
                          value={game.price}
                          onChange={(event) =>
                            updateGame(game.id, 'price', event.target.value)
                          }
                          className="rounded-xl border border-purple-500/20 bg-[#100018] px-4 py-3 outline-none focus:border-purple-400"
                        />

                        <input
                          type="number"
                          value={game.stock}
                          onChange={(event) =>
                            updateGame(game.id, 'stock', event.target.value)
                          }
                          className="rounded-xl border border-purple-500/20 bg-[#100018] px-4 py-3 outline-none focus:border-purple-400"
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(game.id)}
                        className="rounded-xl bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'orders' && (
            <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
              <h3 className="text-2xl font-black text-purple-400">Pedidos</h3>

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
                      <tr key={order.id} className="border-t border-purple-500/10">
                        <td className="p-4 font-bold text-purple-400">
                          {order.id}
                        </td>
                        <td className="p-4">{order.customerName}</td>
                        <td className="p-4">{order.game}</td>
                        <td className="p-4">{formatPrice(order.price)}</td>
                        <td className="p-4">{order.status}</td>
                        <td className="p-4">
                          <button
                            onClick={() => markOrderAsDelivered(order.id)}
                            className="rounded-xl bg-purple-500 px-4 py-2 font-bold text-black"
                          >
                            Marcar entregue
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'payment' && (
            <div className="grid gap-8 xl:grid-cols-2">
              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">
                  Pagamento PIX
                </h3>

                <div className="mt-6 space-y-4">
                  <AdminInput
                    label="Chave PIX"
                    value={storeSettings.pixKey}
                    onChange={(v) =>
                      setStoreSettings({ ...storeSettings, pixKey: v })
                    }
                  />

                  <AdminInput
                    label="WhatsApp"
                    value={storeSettings.whatsapp}
                    onChange={(v) =>
                      setStoreSettings({ ...storeSettings, whatsapp: v })
                    }
                  />

                  <AdminInput
                    label="Access Token Mercado Pago"
                    value={storeSettings.mercadoPagoToken}
                    onChange={(v) =>
                      setStoreSettings({
                        ...storeSettings,
                        mercadoPagoToken: v,
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">
                  Informações
                </h3>
                <p className="mt-4 text-slate-300">
                  O PIX é gerado pela rota API configurada no projeto. O envio
                  do comprovante continua sendo manual via WhatsApp.
                </p>
              </div>
            </div>
          )}

          {adminTab === 'appearance' && (
            <div className="grid gap-8 xl:grid-cols-2">
              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">
                  Identidade da loja
                </h3>

                <div className="mt-6 space-y-4">
                  <AdminInput
                    label="Nome da loja"
                    value={storeSettings.storeName}
                    onChange={(v) =>
                      setStoreSettings({
                        ...storeSettings,
                        storeName: v,
                        logoText: v,
                      })
                    }
                  />

                  <AdminInput
                    label="Slogan"
                    value={storeSettings.slogan}
                    onChange={(v) =>
                      setStoreSettings({ ...storeSettings, slogan: v })
                    }
                  />

                  <AdminInput
                    label="Título do banner"
                    value={storeSettings.bannerTitle}
                    onChange={(v) =>
                      setStoreSettings({ ...storeSettings, bannerTitle: v })
                    }
                  />

                  <AdminInput
                    label="Descrição do banner"
                    value={storeSettings.bannerDescription}
                    onChange={(v) =>
                      setStoreSettings({
                        ...storeSettings,
                        bannerDescription: v,
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
                <h3 className="text-2xl font-black text-purple-400">Prévia</h3>

                <div className="mt-6 rounded-3xl border border-purple-500/20 bg-[#100018] p-8">
                  <h4 className="text-4xl font-black text-purple-400">
                    {storeSettings.storeName}
                  </h4>

                  <p className="mt-2 text-slate-400">
                    {storeSettings.slogan}
                  </p>

                  <h5 className="mt-8 text-3xl font-black">
                    {storeSettings.bannerTitle}
                  </h5>

                  <p className="mt-3 text-slate-300">
                    {storeSettings.bannerDescription}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  function AdminTabButton({ label, tab }) {
    return (
      <button
        onClick={() => setAdminTab(tab)}
        className={`w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
          adminTab === tab
            ? 'bg-purple-500 text-black'
            : 'bg-white/5 text-slate-300 hover:bg-white/10'
        }`}
      >
        {label}
      </button>
    )
  }

  function AdminCard({ label, value }) {
    return (
      <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-6">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <strong className="mt-3 block text-3xl font-black text-purple-400">
          {value}
        </strong>
      </div>
    )
  }

  function AdminInput({ label, value, onChange, type = 'text' }) {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-300">
          {label}
        </span>

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-purple-500/20 bg-[#100018] px-5 py-4 text-white outline-none transition focus:border-purple-400"
        />
      </label>
    )
  }

  if (view === 'admin') {
    return adminLogged ? <AdminPanel /> : <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a0826_0%,#050008_45%,#020204_100%)] text-white">
      <header className="sticky top-0 z-50 border-b border-purple-500/10 bg-[#050008]/95 backdrop-blur">
  <div className="border-b border-purple-500/10 py-2 text-center text-sm font-bold text-white">
    <span className="text-purple-400">⚡ Entrega</span>{' '}
    <span className="rounded-md bg-purple-600 px-2 py-1 text-white">
      manual via WhatsApp
    </span>{' '}
    rápido, seguro e sem espera!
  </div>

  <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1 md:px-6">
    <button onClick={() => setView('store')} className="flex items-center gap-3">
     <img
  src="/logo-jr-store.png"
  alt="JR Store"
  className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
/>

      <div className="text-left">
        <h1 className="text-xl font-black text-white">
          {storeSettings.storeName}
        </h1>
        <p className="text-xs text-slate-400">{storeSettings.slogan}</p>
      </div>
    </button>

    <input
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="Buscar produto"
      className="hidden w-full max-w-md rounded-2xl border border-purple-500/20 bg-[#16101f] px-5 py-3 text-white outline-none placeholder:text-slate-400 focus:border-purple-500 md:block"
    />

    <div className="flex items-center gap-3">
      <button
        onClick={() => setView('admin')}
        className="hidden rounded-xl border border-purple-500/20 px-4 py-3 font-bold text-white hover:border-purple-500 md:block"
      >
        Admin
      </button>

      <button
        onClick={() => setIsCartOpen(true)}
        className="rounded-xl bg-purple-600 px-5 py-3 font-black text-white hover:bg-purple-500"
      >
        🛒 Carrinho {cartItemsCount > 0 && `(${cartItemsCount})`}
      </button>
    </div>
  </div>
</header>

<section className="relative overflow-hidden bg-[#050008]">
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:80px_80px]" />
  <div className="absolute inset-0 bg-gradient-to-r from-black via-purple-950/40 to-black" />

  <div className="relative mx-auto flex min-h-[500px] max-w-7xl animate-[fadeIn_0.8s_ease-out] flex-col items-center justify-center px-6 py-20 text-center">
    <h2 className="max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
      A <span className="text-purple-500">loja ideal</span> para gamers que buscam preço e confiança!
    </h2>

    <p className="mt-6 max-w-2xl text-base text-slate-300 md:text-xl">
      {storeSettings.bannerDescription}
    </p>

    <a
      href="#catalogo"
      className="mt-10 rounded-2xl bg-purple-600 px-10 py-5 text-lg font-black text-white transition-all duration-300 hover:scale-105 hover:bg-purple-500 hover:shadow-2xl hover:shadow-cyan-500/30"
    >
      Ver produtos →
</a>

<div className="mt-12 flex flex-wrap items-center justify-center gap-4">
  <div className="rounded-2xl border border-purple-500/20 bg-white/5 px-5 py-3 backdrop-blur">
    <p className="text-sm font-bold text-white">
      ⚡ Entrega rápida
    </p>
  </div>

  <div className="rounded-2xl border border-purple-500/20 bg-white/5 px-5 py-3 backdrop-blur">
    <p className="text-sm font-bold text-white">
      🔒 Compra segura
    </p>
  </div>

  <div className="rounded-2xl border border-purple-500/20 bg-white/5 px-5 py-3 backdrop-blur">
    <p className="text-sm font-bold text-white">
      🎮 Keys Steam originais
    </p>
  </div>
</div>
    
  </div>
</section>

      <main id="catalogo" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-black">Catálogo Steam</h2>
            <p className="mt-2 text-slate-400">
              Busque jogos, promoções e keys disponíveis.
            </p>
          </div>

          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('Todos')
            }}
            className="rounded-2xl border border-purple-500/20 px-5 py-3 font-bold text-white hover:border-cyan-400"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar jogo Steam..."
            className="rounded-2xl border border-purple-500/20 bg-[#12001f] px-5 py-4 text-white outline-none placeholder:text-slate-500 focus:border-purple-400"
          />

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-2xl border border-purple-500/20 bg-[#12001f] px-5 py-4 text-white outline-none focus:border-purple-400"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredGames.map((game) => (
            <ProductCard key={game.id} game={game} />
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="rounded-3xl border border-purple-500/10 bg-[#12001f] p-10 text-center">
            <h4 className="text-2xl font-black text-purple-400">
              Nenhum jogo encontrado
            </h4>
            <p className="mt-2 text-slate-400">
              Tente buscar por outro nome ou categoria.
            </p>
          </div>
        )}
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-6">
          <div className="ml-auto h-full w-full max-w-md overflow-y-auto rounded-3xl border border-cyan-500/20 bg-[#0b1120]/95 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-purple-400">Carrinho</h3>
              <button onClick={() => setIsCartOpen(false)}>Fechar</button>
            </div>

            <div className="mt-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-cyan-500/10 bg-white/[0.03] p-3 transition hover:border-cyan-400/30"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-16 w-12 rounded-lg object-cover"
                    />

                    <div className="flex-1">
                      <h4 className="font-black">{item.title}</h4>
                      <p className="text-purple-400">{formatPrice(item.price)}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="rounded-lg border border-cyan-500/10 bg-cyan-500/10 px-3 py-1 transition hover:bg-cyan-500/20"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="rounded-lg border border-cyan-500/10 bg-cyan-500/10 px-3 py-1 transition hover:bg-cyan-500/20"
                        >
                          +
                        </button>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto text-sm text-red-400"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-purple-500/10 pt-6">
              <div className="flex justify-between text-xl font-black">
                <span>Total</span>
                <span className="text-purple-400">{formatPrice(cartTotal)}</span>
              </div>

              <button
                onClick={openCheckout}
                className="mt-6 w-full rounded-2xl bg-cyan-400 px-6 py-4 font-black text-black transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-300 hover:shadow-xl hover:shadow-cyan-500/30"
              >
                Finalizar compra
              </button>

              <button
                onClick={clearCart}
                className="mt-3 w-full rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 font-bold text-red-300 transition hover:bg-red-500/10"
              >
                Limpar carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-[#100018] p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-purple-400">
                Pagamento PIX
              </h3>
              <button onClick={() => setCheckoutOpen(false)}>Fechar</button>
            </div>

            <p className="mt-3 text-slate-400">
              Pague via PIX e envie o comprovante no WhatsApp.
            </p>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-bold text-slate-300">
                Seu nome
              </span>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Digite seu nome"
                className="w-full rounded-2xl border border-purple-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-purple-400"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-purple-500/10 bg-black p-4 text-left">
              <p className="mb-2 text-sm font-bold text-slate-300">
                PIX copia e cola
              </p>
              <p className="break-all text-xs text-slate-400">
                {pixData?.qr_code || 'Gerando PIX...'}
              </p>
            </div>

            <button
              onClick={copyPixCode}
              className="mt-4 w-full rounded-2xl bg-purple-500 px-6 py-4 font-black text-black hover:bg-purple-400"
            >
              {copiedPix ? 'Código PIX copiado!' : 'Copiar código PIX'}
            </button>

            <button
              onClick={sendReceiptToWhatsapp}
              className="mt-3 w-full rounded-2xl border border-purple-500/30 px-6 py-4 font-bold text-white hover:border-cyan-400"
            >
              Já paguei — enviar comprovante
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>

      <a
        href={`https://wa.me/${storeSettings.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[120] flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-2xl shadow-green-500/40 transition-all duration-300 hover:scale-110 hover:bg-green-400"
      >
        💬
      </a>

    </div>
  )
}