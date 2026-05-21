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
        className="group overflow-hidden rounded-2xl border-2 border-purple-600 bg-[#050816] shadow-lg shadow-purple-900/30 transition hover:-translate-y-1 hover:border-purple-400"
      >
        <div className="bg-black">
          <img
            src={game.image}
            alt={game.title}
            className="h-[360px] w-full object-contain bg-black"
          />
        </div>

        <div className="p-4">
          <span className="mb-3 inline-flex rounded-lg bg-zinc-800 px-3 py-1 text-xs font-bold text-white">
            🔑 Chave Steam
          </span>

          <h3 className="min-h-[56px] text-lg font-black leading-tight text-white">
            {game.title}
          </h3>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-white">
                {formatPrice(game.price)}
              </p>
              <p className="text-sm text-slate-400">À vista no Pix</p>
              <p className="mt-1 text-xs text-cyan-300">
                Estoque: {game.stock} keys
              </p>
            </div>

            <div className="rounded-xl bg-cyan-500/20 p-3 text-cyan-300">
              🎮
            </div>
          </div>

          <button
            disabled={Number(game.stock) <= 0}
            onClick={() => addToCart(game)}
            className="mt-4 w-full rounded-xl bg-purple-600 px-4 py-3 font-black text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-[#0b1120] p-8 shadow-2xl">
          <h1 className="text-4xl font-black text-cyan-400">JR Admin</h1>
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
              className="w-full rounded-2xl border border-cyan-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-cyan-400"
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
              className="w-full rounded-2xl border border-cyan-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-cyan-400"
            />
          </label>

          {loginError && (
            <p className="mt-4 text-sm font-bold text-red-400">{loginError}</p>
          )}

          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-2xl bg-cyan-500 px-6 py-4 text-lg font-black text-black hover:bg-cyan-400"
          >
            Entrar
          </button>

          <button
            onClick={() => setView('store')}
            className="mt-3 w-full rounded-2xl border border-cyan-500/30 px-6 py-4 font-bold text-white hover:border-cyan-400"
          >
            Voltar para loja
          </button>
        </div>
      </div>
    )
  }

  function AdminPanel() {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-cyan-500/10 bg-[#030712] p-6 lg:block">
          <h1 className="text-3xl font-black text-cyan-400">JR Admin</h1>
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
            className="mt-3 w-full rounded-2xl border border-cyan-500/30 px-4 py-3 font-bold text-white hover:border-cyan-400"
          >
            Ver loja
          </button>
        </aside>

        <main className="p-6 lg:ml-72">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-cyan-400">
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
                    className="rounded-xl border border-cyan-500/20 px-3 py-2 text-xs"
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

              <div className="mt-8 rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">Resumo</h3>
                <p className="mt-3 text-slate-300">
                  Seu painel permite cadastrar jogos, editar preços, controlar
                  estoque, configurar PIX/WhatsApp e visualizar pedidos.
                </p>
              </div>
            </div>
          )}

          {adminTab === 'products' && (
            <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">
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
                    className="w-full rounded-2xl bg-cyan-500 px-6 py-4 font-black text-black transition hover:bg-cyan-400"
                  >
                    {newGame.id ? 'Salvar alterações' : 'Cadastrar jogo'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">
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
                          className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                        />

                        <input
                          type="number"
                          value={game.price}
                          onChange={(event) =>
                            updateGame(game.id, 'price', event.target.value)
                          }
                          className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
                        />

                        <input
                          type="number"
                          value={game.stock}
                          onChange={(event) =>
                            updateGame(game.id, 'stock', event.target.value)
                          }
                          className="rounded-xl border border-cyan-500/20 bg-[#0b1120] px-4 py-3 outline-none focus:border-cyan-400"
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
                        <td className="p-4 font-bold text-cyan-400">
                          {order.id}
                        </td>
                        <td className="p-4">{order.customerName}</td>
                        <td className="p-4">{order.game}</td>
                        <td className="p-4">{formatPrice(order.price)}</td>
                        <td className="p-4">{order.status}</td>
                        <td className="p-4">
                          <button
                            onClick={() => markOrderAsDelivered(order.id)}
                            className="rounded-xl bg-cyan-500 px-4 py-2 font-bold text-black"
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
              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">
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

              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">
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
              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">
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

              <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
                <h3 className="text-2xl font-black text-cyan-400">Prévia</h3>

                <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-[#0b1120] p-8">
                  <h4 className="text-4xl font-black text-cyan-400">
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
            ? 'bg-cyan-500 text-black'
            : 'bg-white/5 text-slate-300 hover:bg-white/10'
        }`}
      >
        {label}
      </button>
    )
  }

  function AdminCard({ label, value }) {
    return (
      <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-6">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <strong className="mt-3 block text-3xl font-black text-cyan-400">
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
          className="w-full rounded-2xl border border-cyan-500/20 bg-[#0b1120] px-5 py-4 text-white outline-none transition focus:border-cyan-400"
        />
      </label>
    )
  }

  if (view === 'admin') {
    return adminLogged ? <AdminPanel /> : <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-[#020617]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => setView('store')} className="text-left">
            <h1 className="text-3xl font-black text-cyan-400">
              {storeSettings.logoText}
            </h1>
            <p className="text-sm text-slate-400">{storeSettings.slogan}</p>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold md:flex">
            <button onClick={() => setView('store')}>Início</button>
            <a href="#catalogo">Steam</a>
            <button onClick={() => setView('admin')}>Admin</button>
          </nav>

          <button
            onClick={() => setIsCartOpen(true)}
            className="rounded-2xl bg-cyan-500 px-5 py-3 font-black text-black hover:bg-cyan-400"
          >
            Carrinho {cartItemsCount > 0 && `(${cartItemsCount})`}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.8fr]">
        <div className="flex flex-col justify-center">
          <span className="w-fit rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300">
            Loja digital personalizada
          </span>

          <h2 className="mt-6 text-5xl font-black leading-tight md:text-6xl">
            {storeSettings.bannerTitle}
          </h2>

          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            {storeSettings.bannerDescription}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#catalogo"
              className="rounded-2xl bg-cyan-500 px-6 py-4 font-black text-black hover:bg-cyan-400"
            >
              Ver catálogo
            </a>

            <a
              href={`https://wa.me/${storeSettings.whatsapp}`}
              target="_blank"
              className="rounded-2xl border border-cyan-500/30 px-6 py-4 font-bold text-white hover:border-cyan-400"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-500/20 bg-[#0b1120] p-6 shadow-2xl shadow-cyan-900/20">
          {games[0]?.image ? (
            <img
              src={games[0].image}
              alt={games[0].title}
              className="h-[420px] w-full rounded-2xl object-contain bg-black p-3"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-2xl bg-black text-slate-500">
              Cadastre seu primeiro jogo
            </div>
          )}
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
            className="rounded-2xl border border-cyan-500/20 px-5 py-3 font-bold text-white hover:border-cyan-400"
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

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {filteredGames.map((game) => (
            <ProductCard key={game.id} game={game} />
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="rounded-3xl border border-cyan-500/10 bg-[#111827] p-10 text-center">
            <h4 className="text-2xl font-black text-cyan-400">
              Nenhum jogo encontrado
            </h4>
            <p className="mt-2 text-slate-400">
              Tente buscar por outro nome ou categoria.
            </p>
          </div>
        )}
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 p-6">
          <div className="ml-auto h-full max-w-lg overflow-y-auto rounded-3xl bg-[#0b1120] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-cyan-400">Carrinho</h3>
              <button onClick={() => setIsCartOpen(false)}>Fechar</button>
            </div>

            <div className="mt-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-cyan-500/10 bg-white/5 p-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-20 w-16 rounded-xl object-cover"
                    />

                    <div className="flex-1">
                      <h4 className="font-black">{item.title}</h4>
                      <p className="text-cyan-400">{formatPrice(item.price)}</p>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="rounded-lg bg-white/10 px-3 py-1"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="rounded-lg bg-white/10 px-3 py-1"
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

            <div className="mt-6 border-t border-cyan-500/10 pt-6">
              <div className="flex justify-between text-xl font-black">
                <span>Total</span>
                <span className="text-cyan-400">{formatPrice(cartTotal)}</span>
              </div>

              <button
                onClick={openCheckout}
                className="mt-6 w-full rounded-2xl bg-cyan-500 px-6 py-4 font-black text-black hover:bg-cyan-400"
              >
                Finalizar compra
              </button>

              <button
                onClick={clearCart}
                className="mt-3 w-full rounded-2xl border border-red-500/30 px-6 py-4 font-bold text-red-300"
              >
                Limpar carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-[#0b1120] p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-cyan-400">
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
                className="w-full rounded-2xl border border-cyan-500/20 bg-[#020817] px-5 py-4 text-white outline-none focus:border-cyan-400"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-cyan-500/10 bg-black p-4 text-left">
              <p className="mb-2 text-sm font-bold text-slate-300">
                PIX copia e cola
              </p>
              <p className="break-all text-xs text-slate-400">
                {pixData?.qr_code || 'Gerando PIX...'}
              </p>
            </div>

            <button
              onClick={copyPixCode}
              className="mt-4 w-full rounded-2xl bg-cyan-500 px-6 py-4 font-black text-black hover:bg-cyan-400"
            >
              {copiedPix ? 'Código PIX copiado!' : 'Copiar código PIX'}
            </button>

            <button
              onClick={sendReceiptToWhatsapp}
              className="mt-3 w-full rounded-2xl border border-cyan-500/30 px-6 py-4 font-bold text-white hover:border-cyan-400"
            >
              Já paguei — enviar comprovante
            </button>
          </div>
        </div>
      )}
    </div>
  )
}