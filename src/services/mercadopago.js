import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: 'APP_USR-1301598468203266-051520-3082f0e89caad93f3490ee9bfc121703-1703011597',
})

const payment = new Payment(client)

export async function createPixPayment({ title, price, customer }) {
  const body = {
    transaction_amount: Number(price),
    description: title,
    payment_method_id: 'pix',
    payer: {
      email: customer?.email || 'cliente@email.com',
      first_name: customer?.name || 'Cliente',
    },
  }

  const result = await payment.create({ body })

  return {
    qr_code: result.point_of_interaction.transaction_data.qr_code,
    qr_code_base64:
      result.point_of_interaction.transaction_data.qr_code_base64,
    ticket_url: result.point_of_interaction.transaction_data.ticket_url,
  }
}