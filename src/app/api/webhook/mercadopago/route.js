export async function POST(request) {
  try {
    const body = await request.json()

    console.log('Webhook recebido:', body)

    return Response.json({
      success: true,
      received: body,
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