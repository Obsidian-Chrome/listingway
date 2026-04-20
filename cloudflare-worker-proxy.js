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

    // Retry logic with exponential backoff
    let lastError = null
    const maxRetries = 2
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Increase timeout to 9 seconds
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 9000)

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Listingway-FFXIV-Price-Checker/1.0',
            'Accept': 'application/json'
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // If it's a server error and we have retries left, try again
          if (response.status >= 500 && attempt < maxRetries) {
            lastError = new Error(`Universalis API returned ${response.status}`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
            continue
          }
          
          return new Response(JSON.stringify({ error: `Universalis API returned ${response.status}` }), {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }

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
        lastError = error
        
        // If it's a timeout and we have retries left, try again
        if (error.name === 'AbortError' && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        
        // Otherwise break and return the error
        break
      }
    }
    
    // If we get here, all retries failed
    if (lastError && lastError.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Request timeout after retries' }), {
        status: 504,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return new Response(JSON.stringify({ error: lastError?.message || 'Unknown error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  }
}
