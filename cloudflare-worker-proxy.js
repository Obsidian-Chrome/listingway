// Cloudflare Worker CORS Proxy for Universalis API
// Deploy this on Cloudflare Workers (free tier)
// Uses ES Module syntax

export default {
  async fetch(request, env, ctx) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 })
    }

    // Only allow Universalis API
    if (!targetUrl.startsWith('https://universalis.app/api/v2/')) {
      return new Response('Only Universalis API is allowed', { status: 403 })
    }

    try {
      const response = await fetch(targetUrl)
      const data = await response.text()

      // Return with CORS headers
      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300'
        }
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  }
}
