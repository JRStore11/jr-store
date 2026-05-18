export async function POST(request) {
  try {
    const body = await request.json()

    console.log('Pagamento recebido:', body)

    if (body.action === 'payment.updated') {
      console.log('PIX aprovado!')
    }

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.log(error)

    return Response.json(
      {
        error: error.message,
      },
      { status: 500 }
    )
  }
}