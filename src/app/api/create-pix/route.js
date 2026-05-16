import { MercadoPagoConfig, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
})

const payment = new Payment(client)

export async function POST(request) {
  try {
    const body = await request.json()

    const result = await payment.create({
      body: {
        transaction_amount: Number(body.price),
        description: body.title || 'Compra JR Store',
        payment_method_id: 'pix',

        payer: {
          email: body.email || 'cliente@email.com',
          first_name: body.name || 'Cliente',
        },
      },
    })

    console.log(result)

    return Response.json({
      qr_code:
        result.point_of_interaction?.transaction_data?.qr_code ||
        result.point_of_interaction?.transaction_data?.qr_code_base64,

      qr_code_base64:
        result.point_of_interaction?.transaction_data?.qr_code_base64,

      ticket_url:
        result.point_of_interaction?.transaction_data?.ticket_url,
    })
  } catch (error) {
    console.log(error)

    return Response.json(
      {
        error: error.message,
        details: error,
      },
      { status: 500 }
    )
  }
}